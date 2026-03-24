import { SignJWT, jwtVerify } from 'jose';
import {
  checkAuthRateLimit,
  resolveClientIp
} from '@/lib/auth/rate-limit';
import { createAuthAuditLog } from '@/lib/auth/audit';
import { getOrCreateRequestId } from '@/lib/observability/request-id';

const AUTH_PROVIDER_HANDOFF_TTL_MS = 10 * 60 * 1000;
const AUTH_PROVIDER_HANDOFF_COOKIE = 'skitsaas_auth_provider_handoff';
const START_STATE_HEADER = 'x-skitsaas-auth-provider-state';
const VERIFIED_HANDOFF_HEADER = 'x-skitsaas-auth-provider-handoff-verified';
const HANDOFF_NONCE_HEADER = 'x-skitsaas-auth-provider-handoff-nonce';

type AuthProviderHandoffPayload = {
  providerId: string;
  nonce: string;
  issuedAt: string;
};

export type PreparedAuthProviderHandoff = {
  providerId: string;
  token: string;
  nonce: string;
  expiresAt: Date;
};

function getHandoffKey() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error('AUTH_SECRET is required to sign auth provider handoff tokens.');
  }

  return new TextEncoder().encode(authSecret);
}

function readRequestPath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return '/api/auth/providers';
  }
}

function readRequestId(request: Request) {
  return getOrCreateRequestId(request);
}

function createCookieHeader({
  value,
  providerId,
  expiresAt
}: {
  value: string;
  providerId: string;
  expiresAt: Date;
}) {
  const parts = [
    `${AUTH_PROVIDER_HANDOFF_COOKIE}=${encodeURIComponent(value)}`,
    `Path=/api/auth/providers/${encodeURIComponent(providerId)}`,
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function createExpiredCookieHeader(providerId: string) {
  return createCookieHeader({
    value: '',
    providerId,
    expiresAt: new Date(0)
  });
}

function withSetCookieHeader(response: Response, cookieHeader: string) {
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', cookieHeader);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function withRequestHeader(request: Request, name: string, value: string) {
  const headers = new Headers(request.headers);
  headers.set(name, value);
  return new Request(request, {
    headers
  });
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const entry = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!entry) {
    return null;
  }

  const [, rawValue = ''] = entry.split('=');
  if (!rawValue) {
    return null;
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

async function verifyAuthProviderHandoffToken(input: string) {
  const { payload } = await jwtVerify(input, getHandoffKey(), {
    algorithms: ['HS256']
  });

  const providerId = typeof payload.providerId === 'string' ? payload.providerId : null;
  const nonce = typeof payload.nonce === 'string' ? payload.nonce : null;
  const issuedAt = typeof payload.issuedAt === 'string' ? payload.issuedAt : null;

  if (!providerId || !nonce || !issuedAt) {
    return null;
  }

  return {
    providerId,
    nonce,
    issuedAt
  } satisfies AuthProviderHandoffPayload;
}

async function createAuthProviderHandoffToken(
  providerId: string,
  now = Date.now()
) {
  const expiresAt = new Date(now + AUTH_PROVIDER_HANDOFF_TTL_MS);
  const payload: AuthProviderHandoffPayload = {
    providerId,
    nonce: crypto.randomUUID(),
    issuedAt: new Date(now).toISOString()
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getHandoffKey());

  return {
    token,
    expiresAt,
    nonce: payload.nonce
  };
}

export async function prepareAuthProviderHandoff({
  providerId,
  now = Date.now()
}: {
  providerId: string;
  now?: number;
}): Promise<PreparedAuthProviderHandoff> {
  const normalizedProviderId = providerId.trim();
  const { token, expiresAt, nonce } = await createAuthProviderHandoffToken(
    normalizedProviderId,
    now
  );

  return {
    providerId: normalizedProviderId,
    token,
    nonce,
    expiresAt
  };
}

export function withAuthProviderStartState(
  request: Request,
  nonce: string
) {
  return withRequestHeader(request, START_STATE_HEADER, nonce);
}

async function auditAuthProviderHandoffEvent({
  request,
  providerId,
  action,
  status,
  message,
  metadata
}: {
  request: Request;
  providerId: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'failed';
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await createAuthAuditLog({
    eventType: `auth.provider_handoff.${action}`,
    action,
    status,
    request,
    source: readRequestPath(request),
    ipAddress: resolveClientIp(request),
    requestId: readRequestId(request),
    message,
    metadata: {
      providerId,
      ...metadata
    }
  });
}

export async function applyAuthProviderRateLimit(
  request: Request,
  action: 'start' | 'callback',
  {
    providerId
  }: {
    providerId?: string;
  } = {}
) {
  const ip = resolveClientIp(request);
  const rateLimit = await checkAuthRateLimit({ ip, action });
  if (!rateLimit.limited) {
    return null;
  }

  if (providerId) {
    await auditAuthProviderHandoffEvent({
      request,
      providerId,
      action: `${action}_rate_limited`,
      status: 'warning',
      message: `Auth provider ${action} handoff was rate-limited.`,
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds ?? 60
      }
    });
  }

  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(rateLimit.retryAfterSeconds ?? 60)
      }
    }
  );
}

export async function attachAuthProviderHandoff(
  response: Response,
  {
    request,
    providerId,
    now = Date.now()
  }: {
    request: Request;
    providerId: string;
    now?: number;
  }
) {
  const handoff = await prepareAuthProviderHandoff({
    providerId,
    now
  });

  return attachPreparedAuthProviderHandoff(response, {
    request,
    handoff
  });
}

export async function attachPreparedAuthProviderHandoff(
  response: Response,
  {
    request,
    handoff
  }: {
    request: Request;
    handoff: PreparedAuthProviderHandoff;
  }
) {
  await auditAuthProviderHandoffEvent({
    request,
    providerId: handoff.providerId,
    action: 'start_issued',
    status: 'info',
    message: 'Auth provider handoff cookie issued.'
  });

  return withSetCookieHeader(
    response,
    createCookieHeader({
      value: handoff.token,
      providerId: handoff.providerId,
      expiresAt: handoff.expiresAt
    })
  );
}

export function clearAuthProviderHandoff(response: Response, providerId: string) {
  return withSetCookieHeader(response, createExpiredCookieHeader(providerId));
}

export async function validateAuthProviderHandoff(
  request: Request,
  {
    providerId
  }: {
    providerId: string;
  }
): Promise<
  | {
      ok: true;
      request: Request;
      nonce: string;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const normalizedProviderId = providerId.trim();
  const token = readCookie(request, AUTH_PROVIDER_HANDOFF_COOKIE);
  if (!token) {
    await auditAuthProviderHandoffEvent({
      request,
      providerId: normalizedProviderId,
      action: 'callback_denied',
      status: 'warning',
      message: 'Auth provider callback denied because the handoff cookie is missing.',
      metadata: {
        reason: 'missing_handoff_cookie'
      }
    });
    return {
      ok: false,
      response: clearAuthProviderHandoff(
        Response.json(
          { error: 'auth_provider_handoff_invalid_or_expired' },
          { status: 409 }
        ),
        normalizedProviderId
      )
    };
  }

  try {
    const payload = await verifyAuthProviderHandoffToken(token);
    if (!payload || payload.providerId !== normalizedProviderId) {
      await auditAuthProviderHandoffEvent({
        request,
        providerId: normalizedProviderId,
        action: 'callback_denied',
        status: 'warning',
        message: 'Auth provider callback denied because the handoff cookie is invalid.',
        metadata: {
          reason: 'provider_mismatch_or_invalid'
        }
      });
      return {
        ok: false,
        response: clearAuthProviderHandoff(
          Response.json(
            { error: 'auth_provider_handoff_invalid_or_expired' },
            { status: 409 }
          ),
          normalizedProviderId
        )
      };
    }

    await auditAuthProviderHandoffEvent({
      request,
      providerId: normalizedProviderId,
      action: 'callback_verified',
      status: 'success',
      message: 'Auth provider callback handoff verified.'
    });

    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(VERIFIED_HANDOFF_HEADER, '1');
    forwardedHeaders.set(HANDOFF_NONCE_HEADER, payload.nonce);

    return {
      ok: true,
      request: new Request(request, {
        headers: forwardedHeaders
      }),
      nonce: payload.nonce
    };
  } catch {
    await auditAuthProviderHandoffEvent({
      request,
      providerId: normalizedProviderId,
      action: 'callback_denied',
      status: 'warning',
      message: 'Auth provider callback denied because the handoff cookie expired or failed verification.',
      metadata: {
        reason: 'token_expired_or_unverifiable'
      }
    });
    return {
      ok: false,
      response: clearAuthProviderHandoff(
        Response.json(
          { error: 'auth_provider_handoff_invalid_or_expired' },
          { status: 409 }
        ),
        normalizedProviderId
      )
    };
  }
}
