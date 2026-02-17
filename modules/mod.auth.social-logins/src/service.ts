import { createHash, randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { and, eq, gt, isNull } from '@skitsaas/sdk/db';
import { getDb, parseJsonBody, setSessionForUser } from '@skitsaas/sdk/server';
import {
  authExternalIdentities,
  modAuthSocialOauthStates,
  teamMembers,
  teams,
  users
} from '../db/schema';
import {
  SOCIAL_AUTH_AREAS,
  SOCIAL_AUTH_FLOW_VALUES,
  type SocialAuthArea,
  type SocialAuthFlow,
  type SocialProviderId
} from './constants';
import { getSocialProviderConfig } from './config';

type ModuleUser = {
  id?: unknown;
  role?: unknown;
  email?: unknown;
};

type ExternalProfile = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  accountId: string | null;
  claims: Record<string, unknown>;
};

type OauthTokenResult = {
  accessToken: string;
  idToken: string | null;
  tokenType: string | null;
  scope: string | null;
  raw: Record<string, unknown>;
};

function getSocialDb() {
  return getDb<any>();
}

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizePositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function toLowerString(value: unknown) {
  return toTrimmedString(value).toLowerCase();
}

function normalizeOptionalRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeEmail(value: unknown) {
  const normalized = toLowerString(value);
  if (!normalized || !normalized.includes('@')) {
    return null;
  }

  return normalized;
}

function isSocialAuthFlow(value: string): value is SocialAuthFlow {
  return (SOCIAL_AUTH_FLOW_VALUES as readonly string[]).includes(value);
}

function isSocialAuthArea(value: string): value is SocialAuthArea {
  return (SOCIAL_AUTH_AREAS as readonly string[]).includes(value);
}

function normalizeAuthFlow(value: unknown): SocialAuthFlow {
  const normalized = toLowerString(value);
  if (isSocialAuthFlow(normalized)) {
    return normalized;
  }

  return 'login';
}

function normalizeAuthArea(value: unknown): SocialAuthArea {
  const normalized = toLowerString(value);
  if (isSocialAuthArea(normalized)) {
    return normalized;
  }

  return 'dashboard';
}

function serializeJson(value: unknown) {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value).slice(0, 12000);
  } catch {
    return null;
  }
}

function readRequestIpAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded
      .split(',')
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);
    if (first) {
      return first;
    }
  }

  const realIp = toTrimmedString(request.headers.get('x-real-ip'));
  return realIp || null;
}

function wantsJsonResponse(request: Request) {
  if (request.method !== 'GET') {
    return true;
  }

  const format = new URL(request.url).searchParams.get('format');
  if (toLowerString(format) === 'json') {
    return true;
  }

  const accept = toLowerString(request.headers.get('accept'));
  if (!accept) {
    return false;
  }

  return accept.includes('application/json');
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });
}

function redirectResponse(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location,
      'cache-control': 'no-store'
    }
  });
}

function buildFailureRedirectPath({
  area,
  flow,
  providerId,
  error
}: {
  area: SocialAuthArea;
  flow: SocialAuthFlow;
  providerId: SocialProviderId;
  error: string;
}) {
  const path =
    flow === 'link'
      ? '/dashboard/custom/social-logins'
      : area === 'admin'
        ? '/admin/login'
        : '/login';
  const search = new URLSearchParams();
  search.set('authError', error);
  search.set('provider', providerId);
  return `${path}?${search.toString()}`;
}

function parseOptionalRedirectPath(value: unknown, area: SocialAuthArea) {
  const normalized = toTrimmedString(value);
  if (!normalized || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  if (area === 'admin' && !normalized.startsWith('/admin')) {
    return null;
  }

  return normalized;
}

function resolvePostAuthRedirect({
  area,
  role,
  redirectOverride
}: {
  area: SocialAuthArea;
  role: string;
  redirectOverride: string | null;
}) {
  if (area === 'admin') {
    if (role !== 'owner' && role !== 'admin') {
      return null;
    }

    return redirectOverride && redirectOverride.startsWith('/admin')
      ? redirectOverride
      : '/admin';
  }

  if (redirectOverride) {
    return redirectOverride;
  }

  return '/dashboard';
}

function generateToken(size = 32) {
  return randomBytes(size).toString('base64url');
}

function createPkceCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function extractModuleUserId(user: ModuleUser | null) {
  return normalizePositiveInt(user?.id);
}

async function loadActiveUserById(userId: number) {
  const db = getSocialDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || row.deletedAt || row.accountStatus !== 'active') {
    return null;
  }

  return row;
}

async function loadActiveUserByEmail(email: string) {
  const db = getSocialDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!row || row.deletedAt || row.accountStatus !== 'active') {
    return null;
  }

  return row;
}

async function findIdentityByProviderSubject({
  providerId,
  providerSubject
}: {
  providerId: SocialProviderId;
  providerSubject: string;
}) {
  const db = getSocialDb();
  const [row] = await db
    .select({
      id: authExternalIdentities.id,
      userId: authExternalIdentities.userId,
      providerId: authExternalIdentities.providerId,
      providerSubject: authExternalIdentities.providerSubject
    })
    .from(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.providerId, providerId),
        eq(authExternalIdentities.providerSubject, providerSubject)
      )
    )
    .limit(1);

  return row ?? null;
}

async function findIdentityByUserProvider({
  userId,
  providerId
}: {
  userId: number;
  providerId: SocialProviderId;
}) {
  const db = getSocialDb();
  const [row] = await db
    .select({
      id: authExternalIdentities.id,
      providerSubject: authExternalIdentities.providerSubject
    })
    .from(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.userId, userId),
        eq(authExternalIdentities.providerId, providerId)
      )
    )
    .limit(1);

  return row ?? null;
}

async function updateIdentityRecord({
  identityId,
  profile
}: {
  identityId: number;
  profile: ExternalProfile;
}) {
  const now = new Date();
  const db = getSocialDb();
  await db
    .update(authExternalIdentities)
    .set({
      providerEmail: profile.email,
      providerAccountId: profile.accountId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      claims: serializeJson(profile.claims),
      metadata: serializeJson({
        emailVerified: profile.emailVerified
      }),
      lastLoginAt: now,
      updatedAt: now
    })
    .where(eq(authExternalIdentities.id, identityId));
}

async function insertIdentityRecord({
  userId,
  providerId,
  profile
}: {
  userId: number;
  providerId: SocialProviderId;
  profile: ExternalProfile;
}) {
  const now = new Date();
  const db = getSocialDb();
  await db.insert(authExternalIdentities).values({
    userId,
    providerId,
    providerSubject: profile.subject,
    providerEmail: profile.email,
    providerAccountId: profile.accountId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    claims: serializeJson(profile.claims),
    metadata: serializeJson({
      emailVerified: profile.emailVerified
    }),
    linkedAt: now,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now
  });
}

async function createUserWithDefaultTeam({
  email,
  displayName
}: {
  email: string;
  displayName: string | null;
}) {
  const db = getSocialDb();
  const now = new Date();
  const randomPasswordHash = await hash(generateToken(24), 10);

  return db.transaction(async (tx: any) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email,
        name: displayName || email,
        passwordHash: randomPasswordHash,
        role: 'owner',
        accountStatus: 'active',
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        accountStatus: users.accountStatus,
        deletedAt: users.deletedAt
      });

    if (!createdUser) {
      throw new Error('user_create_failed');
    }

    const [createdTeam] = await tx
      .insert(teams)
      .values({
        name: `${email}'s Team`,
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: teams.id
      });

    if (!createdTeam) {
      throw new Error('team_create_failed');
    }

    await tx.insert(teamMembers).values({
      userId: createdUser.id,
      teamId: createdTeam.id,
      role: 'owner',
      joinedAt: now
    });

    return createdUser;
  });
}

async function createOauthState({
  providerId,
  flow,
  area,
  stateToken,
  stateNonce,
  pkceCodeVerifier,
  requestedByUserId,
  redirectTo,
  stateTtlSeconds
}: {
  providerId: SocialProviderId;
  flow: SocialAuthFlow;
  area: SocialAuthArea;
  stateToken: string;
  stateNonce: string;
  pkceCodeVerifier: string | null;
  requestedByUserId: number | null;
  redirectTo: string | null;
  stateTtlSeconds: number;
}) {
  const db = getSocialDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + stateTtlSeconds * 1000);

  await db.insert(modAuthSocialOauthStates).values({
    providerId,
    flow,
    stateToken,
    stateNonce,
    pkceCodeVerifier,
    area,
    requestedByUserId,
    redirectTo,
    metadata: null,
    issuedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now
  });

  return {
    expiresAt
  };
}

async function consumeOauthState({
  providerId,
  stateToken
}: {
  providerId: SocialProviderId;
  stateToken: string;
}) {
  const now = new Date();
  const db = getSocialDb();
  const [row] = await db
    .update(modAuthSocialOauthStates)
    .set({
      consumedAt: now,
      updatedAt: now
    })
    .where(
      and(
        eq(modAuthSocialOauthStates.providerId, providerId),
        eq(modAuthSocialOauthStates.stateToken, stateToken),
        isNull(modAuthSocialOauthStates.consumedAt),
        gt(modAuthSocialOauthStates.expiresAt, now)
      )
    )
    .returning({
      providerId: modAuthSocialOauthStates.providerId,
      flow: modAuthSocialOauthStates.flow,
      area: modAuthSocialOauthStates.area,
      stateNonce: modAuthSocialOauthStates.stateNonce,
      pkceCodeVerifier: modAuthSocialOauthStates.pkceCodeVerifier,
      requestedByUserId: modAuthSocialOauthStates.requestedByUserId,
      redirectTo: modAuthSocialOauthStates.redirectTo
    });

  return row ?? null;
}

function buildProviderCallbackUrl({
  providerId,
  request,
  callbackBaseUrl
}: {
  providerId: SocialProviderId;
  request: Request;
  callbackBaseUrl: string | null;
}) {
  const origin = callbackBaseUrl || new URL(request.url).origin;
  return `${origin.replace(/\/+$/, '')}/api/auth/providers/${providerId}/callback`;
}

async function readRequestPayload(request: Request) {
  if (request.method === 'GET') {
    return null;
  }

  return parseJsonBody<Record<string, unknown>>(request);
}

async function resolveOAuthStartInput(request: Request) {
  const url = new URL(request.url);
  const body = await readRequestPayload(request);

  const area = normalizeAuthArea(body?.area ?? url.searchParams.get('area'));
  const flow = normalizeAuthFlow(body?.flow ?? url.searchParams.get('flow'));
  const redirectTo = parseOptionalRedirectPath(
    body?.redirectTo ?? url.searchParams.get('redirectTo'),
    area
  );

  return {
    area,
    flow,
    redirectTo
  };
}

async function resolveOAuthCallbackInput(request: Request) {
  const url = new URL(request.url);
  const body = await readRequestPayload(request);
  const providerError = toTrimmedString(
    url.searchParams.get('error') || body?.error
  );

  return {
    code: toTrimmedString(url.searchParams.get('code') || body?.code),
    state: toTrimmedString(url.searchParams.get('state') || body?.state),
    providerError,
    providerErrorDescription: toTrimmedString(
      url.searchParams.get('error_description') || body?.errorDescription
    ),
    areaHint: normalizeAuthArea(body?.area ?? url.searchParams.get('area'))
  };
}

function encodeBasicAuth(clientId: string, clientSecret: string) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function exchangeAuthorizationCode({
  tokenUrl,
  clientId,
  clientSecret,
  callbackUrl,
  code,
  codeVerifier,
  tokenAuthMethod
}: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  code: string;
  codeVerifier: string | null;
  tokenAuthMethod: 'client_secret_post' | 'client_secret_basic';
}): Promise<OauthTokenResult | null> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', callbackUrl);

  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded'
  });

  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  if (tokenAuthMethod === 'client_secret_basic') {
    headers.set('authorization', `Basic ${encodeBasicAuth(clientId, clientSecret)}`);
    body.set('client_id', clientId);
  } else {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString()
  }).catch(() => null);

  if (!response) {
    return null;
  }

  const contentType = toLowerString(response.headers.get('content-type'));
  let parsed: Record<string, unknown> | null = null;
  if (contentType.includes('application/json')) {
    parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  } else {
    const text = await response.text().catch(() => '');
    const params = new URLSearchParams(text);
    parsed = Object.fromEntries(params.entries());
  }

  if (!response.ok || !parsed) {
    return null;
  }

  const accessToken = toTrimmedString(parsed.access_token);
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    idToken: toTrimmedString(parsed.id_token) || null,
    tokenType: toTrimmedString(parsed.token_type) || null,
    scope: toTrimmedString(parsed.scope) || null,
    raw: parsed
  };
}

async function fetchJsonWithBearerToken({
  url,
  accessToken,
  extraHeaders
}: {
  url: string;
  accessToken: string;
  extraHeaders?: Record<string, string>;
}) {
  const headers = new Headers({
    authorization: `Bearer ${accessToken}`,
    accept: 'application/json',
    ...extraHeaders
  });

  const response = await fetch(url, {
    method: 'GET',
    headers
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
}

async function readGitHubVerifiedEmail({
  accessToken,
  emailInfoUrl
}: {
  accessToken: string;
  emailInfoUrl: string | null;
}) {
  if (!emailInfoUrl) {
    return {
      email: null,
      emailVerified: false
    };
  }

  const response = await fetch(emailInfoUrl, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'saas-starter-auth'
    }
  }).catch(() => null);

  if (!response || !response.ok) {
    return {
      email: null,
      emailVerified: false
    };
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!Array.isArray(payload)) {
    return {
      email: null,
      emailVerified: false
    };
  }

  const normalizedEntries = payload
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .map((entry) => ({
      email: normalizeEmail(entry.email),
      primary: Boolean(entry.primary),
      verified: Boolean(entry.verified)
    }))
    .filter((entry) => entry.email && entry.verified);

  const preferred =
    normalizedEntries.find((entry) => entry.primary) ?? normalizedEntries[0];

  return {
    email: preferred?.email ?? null,
    emailVerified: Boolean(preferred?.verified)
  };
}

async function fetchExternalProfile({
  providerId,
  userInfoUrl,
  emailInfoUrl,
  accessToken
}: {
  providerId: SocialProviderId;
  userInfoUrl: string;
  emailInfoUrl: string | null;
  accessToken: string;
}): Promise<ExternalProfile | null> {
  if (providerId === 'google') {
    const payload = await fetchJsonWithBearerToken({
      url: userInfoUrl,
      accessToken
    });
    if (!payload) {
      return null;
    }

    const subject = toTrimmedString(payload.sub);
    if (!subject) {
      return null;
    }

    return {
      subject,
      email: normalizeEmail(payload.email),
      emailVerified: payload.email_verified === true,
      displayName: toTrimmedString(payload.name) || null,
      avatarUrl: toTrimmedString(payload.picture) || null,
      accountId: subject,
      claims: payload
    };
  }

  if (providerId === 'github') {
    const payload = await fetchJsonWithBearerToken({
      url: userInfoUrl,
      accessToken,
      extraHeaders: {
        accept: 'application/vnd.github+json',
        'user-agent': 'saas-starter-auth'
      }
    });
    if (!payload) {
      return null;
    }

    const subjectCandidate = toTrimmedString(payload.id || payload.node_id);
    const subject = subjectCandidate || toTrimmedString(payload.login);
    if (!subject) {
      return null;
    }

    const verifiedEmail = await readGitHubVerifiedEmail({
      accessToken,
      emailInfoUrl
    });

    return {
      subject,
      email: verifiedEmail.email || normalizeEmail(payload.email),
      emailVerified: verifiedEmail.emailVerified,
      displayName: toTrimmedString(payload.name || payload.login) || null,
      avatarUrl: toTrimmedString(payload.avatar_url) || null,
      accountId: toTrimmedString(payload.login || payload.id) || null,
      claims: {
        user: payload,
        emails: verifiedEmail.email ? { email: verifiedEmail.email } : null
      }
    };
  }

  const xUrl = new URL(userInfoUrl);
  if (!xUrl.searchParams.has('user.fields')) {
    xUrl.searchParams.set(
      'user.fields',
      'id,name,username,profile_image_url'
    );
  }
  const payload = await fetchJsonWithBearerToken({
    url: xUrl.toString(),
    accessToken
  });
  if (!payload) {
    return null;
  }

  const data =
    normalizeOptionalRecord(payload.data) ??
    normalizeOptionalRecord(payload.user) ??
    payload;
  if (!data) {
    return null;
  }

  const subject = toTrimmedString(data.id);
  if (!subject) {
    return null;
  }

  return {
    subject,
    email: normalizeEmail(data.email),
    emailVerified: data.email_verified === true,
    displayName: toTrimmedString(data.name || data.username) || null,
    avatarUrl: toTrimmedString(data.profile_image_url) || null,
    accountId: subject,
    claims: payload
  };
}

async function ensureIdentityLinkedToUser({
  userId,
  providerId,
  profile
}: {
  userId: number;
  providerId: SocialProviderId;
  profile: ExternalProfile;
}) {
  const byUserProvider = await findIdentityByUserProvider({
    userId,
    providerId
  });
  if (byUserProvider && byUserProvider.providerSubject !== profile.subject) {
    return {
      ok: false,
      error: 'provider_account_conflict'
    } as const;
  }

  if (byUserProvider) {
    await updateIdentityRecord({
      identityId: byUserProvider.id,
      profile
    });
    return {
      ok: true
    } as const;
  }

  await insertIdentityRecord({
    userId,
    providerId,
    profile
  });

  return {
    ok: true
  } as const;
}

async function resolveUserForLoginFlow({
  providerId,
  profile
}: {
  providerId: SocialProviderId;
  profile: ExternalProfile;
}) {
  const existingBySubject = await findIdentityByProviderSubject({
    providerId,
    providerSubject: profile.subject
  });

  if (existingBySubject) {
    const linkedUser = await loadActiveUserById(existingBySubject.userId);
    if (!linkedUser) {
      return {
        ok: false,
        error: 'linked_user_not_available'
      } as const;
    }

    await updateIdentityRecord({
      identityId: existingBySubject.id,
      profile
    });
    return {
      ok: true,
      user: linkedUser
    } as const;
  }

  if (!profile.email || !profile.emailVerified) {
    return {
      ok: false,
      error: 'email_verification_required'
    } as const;
  }

  const existingByEmail = await loadActiveUserByEmail(profile.email);
  const user =
    existingByEmail ??
    (await createUserWithDefaultTeam({
      email: profile.email,
      displayName: profile.displayName
    }));
  const linkResult = await ensureIdentityLinkedToUser({
    userId: user.id,
    providerId,
    profile
  });
  if (!linkResult.ok) {
    return linkResult;
  }

  return {
    ok: true,
    user
  } as const;
}

async function resolveUserForLinkFlow({
  providerId,
  profile,
  stateRequestedByUserId,
  currentUser
}: {
  providerId: SocialProviderId;
  profile: ExternalProfile;
  stateRequestedByUserId: number | null;
  currentUser: ModuleUser | null;
}) {
  const currentUserId = extractModuleUserId(currentUser);
  if (!currentUserId || !stateRequestedByUserId || currentUserId !== stateRequestedByUserId) {
    return {
      ok: false,
      error: 'auth_required_for_link'
    } as const;
  }

  const activeUser = await loadActiveUserById(currentUserId);
  if (!activeUser) {
    return {
      ok: false,
      error: 'user_not_found'
    } as const;
  }

  const existingBySubject = await findIdentityByProviderSubject({
    providerId,
    providerSubject: profile.subject
  });
  if (existingBySubject && existingBySubject.userId !== currentUserId) {
    return {
      ok: false,
      error: 'provider_account_already_linked'
    } as const;
  }

  if (existingBySubject) {
    await updateIdentityRecord({
      identityId: existingBySubject.id,
      profile
    });
    return {
      ok: true,
      user: activeUser
    } as const;
  }

  const linkResult = await ensureIdentityLinkedToUser({
    userId: currentUserId,
    providerId,
    profile
  });
  if (!linkResult.ok) {
    return linkResult;
  }

  return {
    ok: true,
    user: activeUser
  } as const;
}

export async function createSocialAuthorizationStart({
  providerId,
  request,
  user
}: {
  providerId: SocialProviderId;
  request: Request;
  user: ModuleUser | null;
}) {
  const providerConfig = await getSocialProviderConfig(providerId);
  if (
    !providerConfig.enabled ||
    !providerConfig.clientId ||
    !providerConfig.clientSecret
  ) {
    return jsonResponse(
      {
        ok: false,
        error: 'provider_not_ready'
      },
      503
    );
  }

  const startInput = await resolveOAuthStartInput(request);
  if (startInput.flow === 'link' && !extractModuleUserId(user)) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required_for_link'
      },
      401
    );
  }

  const callbackUrl = buildProviderCallbackUrl({
    providerId,
    request,
    callbackBaseUrl: providerConfig.callbackBaseUrl
  });
  const stateToken = generateToken(32);
  const stateNonce = generateToken(16);
  const codeVerifier = providerConfig.usePkce ? generateToken(64) : null;

  const oauthParams = new URLSearchParams({
    response_type: 'code',
    client_id: providerConfig.clientId,
    redirect_uri: callbackUrl,
    scope: providerConfig.scopes.join(' '),
    state: stateToken,
    nonce: stateNonce
  });
  if (codeVerifier) {
    oauthParams.set('code_challenge', createPkceCodeChallenge(codeVerifier));
    oauthParams.set('code_challenge_method', 'S256');
  }

  await createOauthState({
    providerId,
    flow: startInput.flow,
    area: startInput.area,
    stateToken,
    stateNonce,
    pkceCodeVerifier: codeVerifier,
    requestedByUserId:
      startInput.flow === 'link' ? extractModuleUserId(user) : null,
    redirectTo: startInput.redirectTo,
    stateTtlSeconds: providerConfig.stateTtlSeconds
  });

  const authorizationUrl = new URL(providerConfig.authorizeUrl);
  authorizationUrl.search = oauthParams.toString();

  if (wantsJsonResponse(request)) {
    return jsonResponse({
      ok: true,
      providerId,
      flow: startInput.flow,
      area: startInput.area,
      authorizationUrl: authorizationUrl.toString()
    });
  }

  return redirectResponse(authorizationUrl.toString());
}

export async function handleSocialAuthorizationCallback({
  providerId,
  request,
  user
}: {
  providerId: SocialProviderId;
  request: Request;
  user: ModuleUser | null;
}) {
  const callbackInput = await resolveOAuthCallbackInput(request);
  const wantsJson = wantsJsonResponse(request);

  const providerConfig = await getSocialProviderConfig(providerId);
  if (
    !providerConfig.enabled ||
    !providerConfig.clientId ||
    !providerConfig.clientSecret
  ) {
    return jsonResponse(
      {
        ok: false,
        error: 'provider_not_ready'
      },
      503
    );
  }

  if (callbackInput.providerError) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: callbackInput.providerError,
          providerErrorDescription: callbackInput.providerErrorDescription || null
        },
        400
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area: callbackInput.areaHint,
        flow: 'login',
        providerId,
        error: callbackInput.providerError
      })
    );
  }

  if (!callbackInput.state || !callbackInput.code) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: 'invalid_callback_payload'
        },
        400
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area: callbackInput.areaHint,
        flow: 'login',
        providerId,
        error: 'invalid_callback_payload'
      })
    );
  }

  const state = await consumeOauthState({
    providerId,
    stateToken: callbackInput.state
  });
  if (!state) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: 'oauth_state_invalid_or_expired'
        },
        409
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area: callbackInput.areaHint,
        flow: 'login',
        providerId,
        error: 'oauth_state_invalid_or_expired'
      })
    );
  }

  const callbackUrl = buildProviderCallbackUrl({
    providerId,
    request,
    callbackBaseUrl: providerConfig.callbackBaseUrl
  });
  const tokenResult = await exchangeAuthorizationCode({
    tokenUrl: providerConfig.tokenUrl,
    clientId: providerConfig.clientId,
    clientSecret: providerConfig.clientSecret,
    callbackUrl,
    code: callbackInput.code,
    codeVerifier: state.pkceCodeVerifier,
    tokenAuthMethod: providerConfig.tokenAuthMethod
  });
  if (!tokenResult) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: 'token_exchange_failed'
        },
        401
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area: normalizeAuthArea(state.area),
        flow: normalizeAuthFlow(state.flow),
        providerId,
        error: 'token_exchange_failed'
      })
    );
  }

  const profile = await fetchExternalProfile({
    providerId,
    userInfoUrl: providerConfig.userInfoUrl,
    emailInfoUrl: providerConfig.emailInfoUrl,
    accessToken: tokenResult.accessToken
  });
  if (!profile) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: 'provider_profile_unavailable'
        },
        401
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area: normalizeAuthArea(state.area),
        flow: normalizeAuthFlow(state.flow),
        providerId,
        error: 'provider_profile_unavailable'
      })
    );
  }

  const flow = normalizeAuthFlow(state.flow);
  const area = normalizeAuthArea(state.area);

  const resolvedUser =
    flow === 'link'
      ? await resolveUserForLinkFlow({
          providerId,
          profile,
          stateRequestedByUserId: normalizePositiveInt(state.requestedByUserId),
          currentUser: user
        })
      : await resolveUserForLoginFlow({
          providerId,
          profile
        });

  if (!resolvedUser.ok) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: resolvedUser.error
        },
        409
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area,
        flow,
        providerId,
        error: resolvedUser.error
      })
    );
  }

  const redirectOverride = parseOptionalRedirectPath(state.redirectTo, area);

  if (flow === 'link') {
    const redirectPath =
      redirectOverride || '/dashboard/custom/social-logins?linked=1';
    if (wantsJson) {
      return jsonResponse({
        ok: true,
        providerId,
        flow,
        userId: resolvedUser.user.id,
        redirectTo: redirectPath
      });
    }

    return redirectResponse(redirectPath);
  }

  const role = toLowerString(resolvedUser.user.role);
  const redirectTarget = resolvePostAuthRedirect({
    area,
    role,
    redirectOverride
  });

  if (!redirectTarget) {
    if (wantsJson) {
      return jsonResponse(
        {
          ok: false,
          error: 'admin_access_required'
        },
        403
      );
    }

    return redirectResponse(
      buildFailureRedirectPath({
        area,
        flow,
        providerId,
        error: 'admin_access_required'
      })
    );
  }

  await setSessionForUser(resolvedUser.user.id, {
    ipAddress: readRequestIpAddress(request),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      authMethod: 'social',
      providerId,
      flow,
      area
    }
  });

  if (wantsJson) {
    return jsonResponse({
      ok: true,
      providerId,
      flow,
      userId: resolvedUser.user.id,
      redirectTo: redirectTarget
    });
  }

  return redirectResponse(redirectTarget);
}

export async function getSocialConnectionsForUser({
  user
}: {
  user: ModuleUser | null;
}) {
  const userId = extractModuleUserId(user);
  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required'
      },
      401
    );
  }

  const db = getSocialDb();
  const rows = await db
    .select({
      id: authExternalIdentities.id,
      providerId: authExternalIdentities.providerId,
      providerSubject: authExternalIdentities.providerSubject,
      providerEmail: authExternalIdentities.providerEmail,
      displayName: authExternalIdentities.displayName,
      avatarUrl: authExternalIdentities.avatarUrl,
      linkedAt: authExternalIdentities.linkedAt,
      lastLoginAt: authExternalIdentities.lastLoginAt
    })
    .from(authExternalIdentities)
    .where(eq(authExternalIdentities.userId, userId));

  return jsonResponse({
    ok: true,
    userId,
    connections: rows
  });
}

export async function disconnectSocialProviderForUser({
  providerId,
  user
}: {
  providerId: SocialProviderId;
  user: ModuleUser | null;
}) {
  const userId = extractModuleUserId(user);
  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required'
      },
      401
    );
  }

  const db = getSocialDb();
  const deletedRows = await db
    .delete(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.userId, userId),
        eq(authExternalIdentities.providerId, providerId)
      )
    )
    .returning({
      id: authExternalIdentities.id
    });

  return jsonResponse({
    ok: true,
    userId,
    providerId,
    disconnected: deletedRows.length > 0
  });
}
