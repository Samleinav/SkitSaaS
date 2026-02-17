import { randomUUID } from 'node:crypto';
import {
  and,
  desc,
  eq,
  gt,
  isNull
} from '@skitsaas/sdk/db';
import { getDb, parseJsonBody, setSessionForUser } from '@skitsaas/sdk/server';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import {
  modAuthPasskeyChallenges,
  modAuthPasskeyCredentials,
  users
} from '../db/schema';
import { getPasskeyModuleRuntimeConfig } from './config';
import { AUTH_PASSKEY_PROVIDER_ID } from './constants';

type ModuleUser = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  name?: unknown;
};

type AuthArea = 'admin' | 'dashboard';
type PasskeyTransport =
  | 'usb'
  | 'nfc'
  | 'ble'
  | 'internal'
  | 'hybrid'
  | 'smart-card'
  | 'cable';

function getPasskeyDb() {
  return getDb<any>();
}

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeAuthArea(value: unknown): AuthArea {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === 'admin') {
    return 'admin';
  }

  return 'dashboard';
}

function normalizeOptionalAuthArea(value: unknown): AuthArea | null {
  const normalized = toTrimmedString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized === 'admin' ? 'admin' : 'dashboard';
}

function normalizePositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeJsonRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
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

function parseJsonArray(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((item) => toTrimmedString(item))
      .filter((item) => item.length > 0);
  } catch {
    return null;
  }
}

function mapDeviceType(value: unknown): 'single_device' | 'multi_device' {
  if (value === 'multiDevice' || value === 'multi_device') {
    return 'multi_device';
  }

  return 'single_device';
}

function normalizeTransport(
  value: string
): PasskeyTransport | null {
  if (
    value === 'usb' ||
    value === 'nfc' ||
    value === 'ble' ||
    value === 'cable' ||
    value === 'internal' ||
    value === 'hybrid' ||
    value === 'smart-card'
  ) {
    return value;
  }

  return null;
}

function parseTransports(value: string | null) {
  const values = parseJsonArray(value);
  if (!values?.length) {
    return undefined;
  }

  const transports = values
    .map((entry) => normalizeTransport(entry))
    .filter((entry): entry is PasskeyTransport => entry !== null);
  return transports.length > 0 ? transports : undefined;
}

function toBase64Url(value: Uint8Array | ArrayBuffer | Buffer) {
  const buffer =
    value instanceof Buffer
      ? value
      : value instanceof Uint8Array
        ? Buffer.from(value)
        : Buffer.from(value);

  return buffer.toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url');
}

function readUserIdFromModuleUser(user: ModuleUser | null) {
  const userId = normalizePositiveInt(user?.id);
  return userId;
}

function normalizeUserRole(value: unknown) {
  return toTrimmedString(value).toLowerCase();
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

function resolveAuthRedirectTarget({
  area,
  role
}: {
  area: AuthArea;
  role: string;
}) {
  if (area === 'admin') {
    if (role === 'owner' || role === 'admin') {
      return '/admin';
    }

    return null;
  }

  return '/dashboard';
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

async function loadPasskeyUserById(userId: number) {
  const db = getPasskeyDb();
  const [userRecord] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRecord) {
    return null;
  }

  if (userRecord.deletedAt || userRecord.accountStatus !== 'active') {
    return null;
  }

  return userRecord;
}

async function loadPasskeyUserByEmail(email: string) {
  const db = getPasskeyDb();
  const [userRecord] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!userRecord) {
    return null;
  }

  if (userRecord.deletedAt || userRecord.accountStatus !== 'active') {
    return null;
  }

  return userRecord;
}

async function listActiveCredentialsByUserId(userId: number) {
  const db = getPasskeyDb();
  return db
    .select({
      id: modAuthPasskeyCredentials.id,
      credentialId: modAuthPasskeyCredentials.credentialId,
      transports: modAuthPasskeyCredentials.transports,
      publicKey: modAuthPasskeyCredentials.publicKey,
      counter: modAuthPasskeyCredentials.counter,
      userId: modAuthPasskeyCredentials.userId
    })
    .from(modAuthPasskeyCredentials)
    .where(
      and(
        eq(modAuthPasskeyCredentials.userId, userId),
        isNull(modAuthPasskeyCredentials.revokedAt)
      )
    )
    .orderBy(desc(modAuthPasskeyCredentials.id));
}

async function findActiveCredentialById(credentialId: string) {
  const db = getPasskeyDb();
  const [credential] = await db
    .select({
      id: modAuthPasskeyCredentials.id,
      userId: modAuthPasskeyCredentials.userId,
      credentialId: modAuthPasskeyCredentials.credentialId,
      publicKey: modAuthPasskeyCredentials.publicKey,
      counter: modAuthPasskeyCredentials.counter,
      transports: modAuthPasskeyCredentials.transports
    })
    .from(modAuthPasskeyCredentials)
    .where(
      and(
        eq(modAuthPasskeyCredentials.credentialId, credentialId),
        isNull(modAuthPasskeyCredentials.revokedAt)
      )
    )
    .limit(1);

  return credential ?? null;
}

async function createPasskeyChallenge({
  flow,
  challenge,
  userId,
  expectedOrigin,
  expectedRpId,
  expectedType,
  challengeTtlSeconds,
  metadata = null
}: {
  flow: 'registration' | 'authentication';
  challenge: string;
  userId: number | null;
  expectedOrigin: string;
  expectedRpId: string;
  expectedType: 'webauthn.create' | 'webauthn.get';
  challengeTtlSeconds: number;
  metadata?: Record<string, unknown> | null;
}) {
  const challengeId = randomUUID().replace(/-/g, '');
  const db = getPasskeyDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + challengeTtlSeconds * 1000);

  await db.insert(modAuthPasskeyChallenges).values({
    challengeId,
    flow,
    challenge,
    userId,
    expectedOrigin,
    expectedRpId,
    expectedType,
    metadata: serializeJson(metadata),
    issuedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now
  });

  return {
    challengeId,
    expiresAt
  };
}

async function consumePasskeyChallenge({
  challengeId,
  flow,
  userId
}: {
  challengeId: string;
  flow: 'registration' | 'authentication';
  userId?: number | null;
}) {
  const db = getPasskeyDb();
  const now = new Date();

  const [challengeRow] = await db
    .update(modAuthPasskeyChallenges)
    .set({
      consumedAt: now,
      updatedAt: now
    })
    .where(
      and(
        eq(modAuthPasskeyChallenges.challengeId, challengeId),
        eq(modAuthPasskeyChallenges.flow, flow),
        isNull(modAuthPasskeyChallenges.consumedAt),
        gt(modAuthPasskeyChallenges.expiresAt, now),
        userId === undefined
          ? undefined
          : userId === null
          ? isNull(modAuthPasskeyChallenges.userId)
          : eq(modAuthPasskeyChallenges.userId, userId)
      )
    )
    .returning({
      id: modAuthPasskeyChallenges.id,
      challenge: modAuthPasskeyChallenges.challenge,
      flow: modAuthPasskeyChallenges.flow,
      userId: modAuthPasskeyChallenges.userId,
      expectedOrigin: modAuthPasskeyChallenges.expectedOrigin,
      expectedRpId: modAuthPasskeyChallenges.expectedRpId,
      expectedType: modAuthPasskeyChallenges.expectedType,
      metadata: modAuthPasskeyChallenges.metadata
    });

  return challengeRow ?? null;
}

function parseChallengeMetadata(rawMetadata: string | null) {
  if (!rawMetadata) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMetadata);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readAreaFromRequest(request: Request) {
  const url = new URL(request.url);
  return normalizeAuthArea(url.searchParams.get('area'));
}

function readEmailHintFromRequest(request: Request) {
  const url = new URL(request.url);
  const email = toTrimmedString(url.searchParams.get('email')).toLowerCase();
  return email || null;
}

function isHtmlRequest(request: Request) {
  if (request.method !== 'GET') {
    return false;
  }

  const accept = toTrimmedString(request.headers.get('accept')).toLowerCase();
  return accept.includes('text/html') || accept.includes('*/*');
}

function renderPasskeyStartPage({
  area
}: {
  area: AuthArea;
}) {
  const escapedArea = area === 'admin' ? 'admin' : 'dashboard';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Passkey sign in</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0b0b0d; color: #ececf1; margin: 0; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: min(480px, 100%); border: 1px solid #2c2d33; border-radius: 12px; padding: 20px; background: #13141a; }
      .title { margin: 0 0 8px; font-size: 20px; }
      .muted { margin: 0; color: #a7a9b3; font-size: 14px; }
      .status { margin-top: 16px; padding: 10px 12px; border-radius: 8px; background: #1a1c25; color: #d7dae6; font-size: 14px; }
      .error { background: #2a1419; color: #ffb3c2; }
      .ok { background: #132419; color: #b4f0c1; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <h1 class="title">Passkey sign in</h1>
        <p class="muted">Area: ${escapedArea}. Complete your passkey prompt to continue.</p>
        <div id="status" class="status">Starting passkey flow...</div>
      </section>
    </main>
    <script>
      const AUTH_AREA = ${JSON.stringify(escapedArea)};

      function base64UrlToBuffer(value) {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      }

      function bufferToBase64Url(value) {
        const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer || value);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
      }

      function toPublicKeyRequestOptions(rawOptions) {
        const options = { ...rawOptions };
        options.challenge = base64UrlToBuffer(options.challenge);
        if (Array.isArray(options.allowCredentials)) {
          options.allowCredentials = options.allowCredentials.map((entry) => ({
            ...entry,
            id: base64UrlToBuffer(entry.id)
          }));
        }
        return options;
      }

      function toAuthenticationResponseJSON(credential) {
        return {
          id: credential.id,
          rawId: bufferToBase64Url(credential.rawId),
          type: credential.type,
          authenticatorAttachment: credential.authenticatorAttachment || null,
          response: {
            clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
            authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
            signature: bufferToBase64Url(credential.response.signature),
            userHandle: credential.response.userHandle
              ? bufferToBase64Url(credential.response.userHandle)
              : null
          }
        };
      }

      function setStatus(message, isError = false) {
        const node = document.getElementById('status');
        node.className = isError ? 'status error' : 'status';
        node.textContent = message;
      }

      async function run() {
        if (!window.PublicKeyCredential) {
          setStatus('Passkey is not supported in this browser.', true);
          return;
        }

        const startResponse = await fetch(window.location.pathname + window.location.search, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ area: AUTH_AREA }),
          credentials: 'same-origin'
        });
        const startPayload = await startResponse.json();
        if (!startResponse.ok || !startPayload.ok) {
          throw new Error(startPayload.error || 'Unable to start passkey authentication.');
        }

        setStatus('Waiting for passkey confirmation...');

        const credential = await navigator.credentials.get({
          publicKey: toPublicKeyRequestOptions(startPayload.publicKey)
        });
        if (!credential) {
          throw new Error('Passkey authentication was cancelled.');
        }

        const callbackUrl = new URL(window.location.href);
        callbackUrl.pathname = callbackUrl.pathname.replace(/\\/start$/, '/callback');

        const verifyResponse = await fetch(callbackUrl.toString(), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            challengeId: startPayload.challengeId,
            area: AUTH_AREA,
            authenticationResponse: toAuthenticationResponseJSON(credential)
          }),
          credentials: 'same-origin'
        });

        const verifyPayload = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyPayload.ok) {
          throw new Error(verifyPayload.error || 'Passkey verification failed.');
        }

        setStatus('Sign in successful. Redirecting...');
        if (verifyPayload.redirectTo) {
          window.location.assign(verifyPayload.redirectTo);
          return;
        }

        window.location.assign(AUTH_AREA === 'admin' ? '/admin' : '/dashboard');
      }

      run().catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Passkey sign in failed.', true);
      });
    </script>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function createRegistrationOptions({
  user
}: {
  user: ModuleUser | null;
}) {
  const userId = readUserIdFromModuleUser(user);
  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required'
      },
      401
    );
  }

  const config = await getPasskeyModuleRuntimeConfig();
  if (!config.enabled || !config.rpId || !config.expectedOrigin) {
    return jsonResponse(
      {
        ok: false,
        error: 'passkey_provider_not_ready'
      },
      503
    );
  }

  const userRecord = await loadPasskeyUserById(userId);
  if (!userRecord || !userRecord.email) {
    return jsonResponse(
      {
        ok: false,
        error: 'user_not_found'
      },
      404
    );
  }

  const existingCredentials = await listActiveCredentialsByUserId(userId);
  const registrationOptions = await generateRegistrationOptions({
    rpID: config.rpId,
    rpName: config.rpName,
    userID: Buffer.from(String(userRecord.id), 'utf8'),
    userName: userRecord.email,
    userDisplayName: userRecord.name || userRecord.email,
    timeout: config.timeoutMs,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: config.requireUserVerification ? 'required' : 'preferred'
    },
    excludeCredentials: existingCredentials.map((credential: { credentialId: string }) => ({
      id: fromBase64Url(credential.credentialId),
      type: 'public-key'
    }))
  });

  const challenge = await createPasskeyChallenge({
    flow: 'registration',
    challenge: registrationOptions.challenge,
    userId,
    expectedOrigin: config.expectedOrigin,
    expectedRpId: config.rpId,
    expectedType: 'webauthn.create',
    challengeTtlSeconds: config.challengeTtlSeconds,
    metadata: {
      providerId: AUTH_PASSKEY_PROVIDER_ID
    }
  });

  return jsonResponse({
    ok: true,
    providerId: AUTH_PASSKEY_PROVIDER_ID,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt.toISOString(),
    publicKey: registrationOptions
  });
}

export async function verifyRegistration({
  user,
  request
}: {
  user: ModuleUser | null;
  request: Request;
}) {
  const userId = readUserIdFromModuleUser(user);
  if (!userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'auth_required'
      },
      401
    );
  }

  const payload = await parseJsonBody<{
    challengeId?: unknown;
    registrationResponse?: unknown;
  }>(request);
  const challengeId = toTrimmedString(payload?.challengeId);
  const registrationResponse = normalizeJsonRecord(payload?.registrationResponse);
  if (!challengeId || !registrationResponse) {
    return jsonResponse(
      {
        ok: false,
        error: 'invalid_payload'
      },
      400
    );
  }

  const challenge = await consumePasskeyChallenge({
    challengeId,
    flow: 'registration',
    userId
  });
  if (!challenge) {
    return jsonResponse(
      {
        ok: false,
        error: 'challenge_not_found_or_expired'
      },
      409
    );
  }

  const verification = await verifyRegistrationResponse({
    response:
      registrationResponse as unknown as Parameters<
        typeof verifyRegistrationResponse
      >[0]['response'],
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.expectedOrigin,
    expectedRPID: challenge.expectedRpId,
    expectedType: challenge.expectedType as 'webauthn.create'
  }).catch(() => null);

  if (!verification?.verified || !verification.registrationInfo) {
    return jsonResponse(
      {
        ok: false,
        error: 'registration_verification_failed'
      },
      400
    );
  }

  const registrationInfo = verification.registrationInfo;
  const credentialId = toTrimmedString(registrationInfo.credentialID);
  if (!credentialId) {
    return jsonResponse(
      {
        ok: false,
        error: 'credential_id_missing'
      },
      400
    );
  }

  const existingCredential = await findActiveCredentialById(credentialId);
  if (existingCredential && existingCredential.userId !== userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'credential_already_linked'
      },
      409
    );
  }

  const transports = serializeJson(
    Array.isArray((registrationResponse.response as { transports?: unknown })?.transports)
      ? ((registrationResponse.response as { transports?: unknown }).transports as unknown[])
      : null
  );
  const credentialPublicKey = toBase64Url(registrationInfo.credentialPublicKey);
  const credentialCounter = Math.max(0, Number(registrationInfo.counter) || 0);
  const credentialAaguid = toTrimmedString(registrationInfo.aaguid);
  const now = new Date();
  const db = getPasskeyDb();

  if (existingCredential) {
    await db
      .update(modAuthPasskeyCredentials)
      .set({
        publicKey: credentialPublicKey,
        counter: credentialCounter,
        transports,
        deviceType: mapDeviceType(registrationInfo.credentialDeviceType),
        backedUp: Boolean(registrationInfo.credentialBackedUp),
        aaguid: credentialAaguid,
        revokedAt: null,
        updatedAt: now
      })
      .where(eq(modAuthPasskeyCredentials.id, existingCredential.id));
  } else {
    await db.insert(modAuthPasskeyCredentials).values({
      userId,
      credentialId,
      publicKey: credentialPublicKey,
      counter: credentialCounter,
      transports,
      deviceType: mapDeviceType(registrationInfo.credentialDeviceType),
      backedUp: Boolean(registrationInfo.credentialBackedUp),
      aaguid: credentialAaguid,
      createdAt: now,
      updatedAt: now
    });
  }

  return jsonResponse({
    ok: true,
    providerId: AUTH_PASSKEY_PROVIDER_ID,
    credentialId
  });
}

export async function createAuthenticationOptions({
  request
}: {
  request: Request;
}) {
  const config = await getPasskeyModuleRuntimeConfig();
  if (!config.enabled || !config.rpId || !config.expectedOrigin) {
    return jsonResponse(
      {
        ok: false,
        error: 'passkey_provider_not_ready'
      },
      503
    );
  }

  const area = readAreaFromRequest(request);
  const requestBody = await parseJsonBody<{ email?: unknown; area?: unknown }>(request);
  const emailFromBody = toTrimmedString(requestBody?.email).toLowerCase();
  const emailHint = emailFromBody || readEmailHintFromRequest(request);

  let userId: number | null = null;
  let allowCredentials:
    | Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials']
    | undefined;

  if (emailHint) {
    const userRecord = await loadPasskeyUserByEmail(emailHint);
    if (userRecord) {
      userId = userRecord.id;
      const credentials = await listActiveCredentialsByUserId(userRecord.id);
      if (credentials.length > 0) {
        allowCredentials = credentials.map((credential: { credentialId: string; transports: string | null }) => ({
          id: credential.credentialId,
          transports: parseTransports(credential.transports)
        })) as Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials'];
      }
    }
  }

  const authenticationOptions = await generateAuthenticationOptions({
    rpID: config.rpId,
    timeout: config.timeoutMs,
    userVerification: config.requireUserVerification ? 'required' : 'preferred',
    allowCredentials
  });

  const challenge = await createPasskeyChallenge({
    flow: 'authentication',
    challenge: authenticationOptions.challenge,
    userId,
    expectedOrigin: config.expectedOrigin,
    expectedRpId: config.rpId,
    expectedType: 'webauthn.get',
    challengeTtlSeconds: config.challengeTtlSeconds,
    metadata: {
      area,
      emailHint: emailHint || null,
      providerId: AUTH_PASSKEY_PROVIDER_ID
    }
  });

  return jsonResponse({
    ok: true,
    providerId: AUTH_PASSKEY_PROVIDER_ID,
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt.toISOString(),
    publicKey: authenticationOptions
  });
}

export async function verifyAuthentication({
  request
}: {
  request: Request;
}) {
  const payload = await parseJsonBody<{
    challengeId?: unknown;
    authenticationResponse?: unknown;
    area?: unknown;
  }>(request);

  const challengeId = toTrimmedString(payload?.challengeId);
  const authenticationResponse = normalizeJsonRecord(payload?.authenticationResponse);
  const requestedArea = normalizeOptionalAuthArea(payload?.area);
  if (!challengeId || !authenticationResponse) {
    return jsonResponse(
      {
        ok: false,
        error: 'invalid_payload'
      },
      400
    );
  }

  const challenge = await consumePasskeyChallenge({
    challengeId,
    flow: 'authentication'
  });
  if (!challenge) {
    return jsonResponse(
      {
        ok: false,
        error: 'challenge_not_found_or_expired'
      },
      409
    );
  }

  const credentialId = toTrimmedString(authenticationResponse.id);
  if (!credentialId) {
    return jsonResponse(
      {
        ok: false,
        error: 'credential_id_missing'
      },
      400
    );
  }

  const credential = await findActiveCredentialById(credentialId);
  if (!credential) {
    return jsonResponse(
      {
        ok: false,
        error: 'credential_not_registered'
      },
      404
    );
  }

  if (challenge.userId && challenge.userId !== credential.userId) {
    return jsonResponse(
      {
        ok: false,
        error: 'credential_user_mismatch'
      },
      409
    );
  }

  const verification = await verifyAuthenticationResponse({
    response:
      authenticationResponse as unknown as Parameters<
        typeof verifyAuthenticationResponse
      >[0]['response'],
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.expectedOrigin,
    expectedRPID: challenge.expectedRpId,
    expectedType: challenge.expectedType as 'webauthn.get',
    authenticator: {
      credentialID: credential.credentialId,
      credentialPublicKey: fromBase64Url(credential.publicKey),
      counter: Math.max(0, Number(credential.counter) || 0),
      transports:
        parseTransports(credential.transports) as unknown as Parameters<
          typeof verifyAuthenticationResponse
        >[0]['authenticator']['transports']
    }
  }).catch(() => null);

  if (!verification?.verified) {
    return jsonResponse(
      {
        ok: false,
        error: 'authentication_verification_failed'
      },
      400
    );
  }

  const userRecord = await loadPasskeyUserById(credential.userId);
  if (!userRecord) {
    return jsonResponse(
      {
        ok: false,
        error: 'user_not_found'
      },
      404
    );
  }

  const role = normalizeUserRole(userRecord.role);
  const challengeMetadata = parseChallengeMetadata(challenge.metadata);
  const challengeArea = normalizeOptionalAuthArea(challengeMetadata?.area);
  const area = requestedArea ?? challengeArea ?? 'dashboard';
  const redirectTarget = resolveAuthRedirectTarget({ area, role });
  if (!redirectTarget) {
    return jsonResponse(
      {
        ok: false,
        error: 'admin_access_required'
      },
      403
    );
  }

  const now = new Date();
  const db = getPasskeyDb();
  await db
    .update(modAuthPasskeyCredentials)
    .set({
      counter: Math.max(
        Number(verification.authenticationInfo.newCounter) || 0,
        Number(credential.counter) || 0
      ),
      lastUsedAt: now,
      updatedAt: now
    })
    .where(eq(modAuthPasskeyCredentials.id, credential.id));

  await setSessionForUser(userRecord.id, {
    ipAddress: readRequestIpAddress(request),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      providerId: AUTH_PASSKEY_PROVIDER_ID,
      authMethod: 'passkey',
      area
    }
  });

  return jsonResponse({
    ok: true,
    providerId: AUTH_PASSKEY_PROVIDER_ID,
    userId: userRecord.id,
    redirectTo: redirectTarget
  });
}

export async function createAuthenticationStartResponse({
  request
}: {
  request: Request;
}) {
  const config = await getPasskeyModuleRuntimeConfig();
  if (!config.enabled || !config.rpId || !config.expectedOrigin) {
    return jsonResponse(
      {
        ok: false,
        error: 'passkey_provider_not_ready'
      },
      503
    );
  }

  if (isHtmlRequest(request)) {
    const area = readAreaFromRequest(request);
    return renderPasskeyStartPage({ area });
  }

  return createAuthenticationOptions({ request });
}
