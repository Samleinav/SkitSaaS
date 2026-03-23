import { compare, hash } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser, authSessions } from '@/lib/db/schema';
import {
  type SessionData,
  isSessionExpired
} from '@/lib/auth/session-state';
import * as sessionStore from '@/lib/auth/session-store';

const SALT_ROUNDS = 10;

function getSessionKey() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error('AUTH_SECRET is required (set it in .env).');
  }

  return new TextEncoder().encode(authSecret);
}

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

export type { SessionData, PersistedAuthSessionState } from '@/lib/auth/session-state';
export { isPersistedSessionActive, isSessionExpired, shouldExpirePersistedSession } from '@/lib/auth/session-state';

export async function signToken(payload: SessionData) {
  const tokenJti = payload.jti?.trim() || payload.sessionId?.trim() || crypto.randomUUID();
  const expiresAt = new Date(payload.expires);
  const expirationValue = Number.isNaN(expiresAt.getTime())
    ? '1 day from now'
    : expiresAt;
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setJti(tokenJti)
    .setExpirationTime(expirationValue)
    .sign(getSessionKey());
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, getSessionKey(), {
    algorithms: ['HS256'],
  });
  return payload as SessionData;
}

export async function tryVerifyToken(input: string) {
  try {
    return await verifyToken(input);
  } catch {
    return null;
  }
}

export async function refreshSignedSessionToken(
  input: string,
  now = Date.now(),
  {
    syncPersistedSession = false,
    ipAddress,
    userAgent
  }: {
    syncPersistedSession?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  } = {}
): Promise<{ token: string; expiresAt: Date } | null> {
  const sessionData = await tryVerifyToken(input);
  if (!sessionData || isSessionExpired(sessionData)) {
    return null;
  }

  const nowDate = new Date(now);
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000);
  let persistedSession =
    syncPersistedSession && sessionData.jti
      ? await sessionStore.getActivePersistedAuthSessionByTokenJti(sessionData.jti, {
          now: nowDate
        })
      : null;

  if (syncPersistedSession && sessionData.jti && !persistedSession) {
    return null;
  }

  if (persistedSession?.sessionId) {
    await sessionStore.refreshPersistedAuthSession({
      sessionId: persistedSession.sessionId,
      expiresAt,
      now: nowDate,
      ipAddress,
      userAgent
    });
  }

  const token = await signToken({
    user: sessionData.user,
    expires: expiresAt.toISOString(),
    sessionId: sessionData.sessionId,
    jti: sessionData.jti
  });

  return { token, expiresAt };
}
export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;

  const sessionData = await tryVerifyToken(session);
  if (!sessionData || isSessionExpired(sessionData)) {
    return null;
  }

  return sessionData;
}

type SetSessionOptions = {
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

function serializeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

async function createAuthSessionRecord({
  sessionId,
  tokenJti,
  userId,
  expiresAt,
  ipAddress = null,
  userAgent = null,
  metadata = null
}: {
  sessionId: string;
  tokenJti: string;
  userId: number;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { db } = await import('@/lib/db/drizzle');
  await db.insert(authSessions).values({
    sessionId,
    tokenJti,
    userId,
    status: 'active',
    issuedAt: new Date(),
    expiresAt,
    lastSeenAt: new Date(),
    lastIpAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    metadata: serializeMetadata(metadata),
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function revokeAuthSessionRecord({
  sessionId,
  reason
}: {
  sessionId: string;
  reason: string;
}) {
  const { db } = await import('@/lib/db/drizzle');
  await db
    .update(authSessions)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: reason,
      updatedAt: new Date()
    })
    .where(
      and(eq(authSessions.sessionId, sessionId), eq(authSessions.status, 'active'))
    );
}

export async function setSession(user: NewUser, options: SetSessionOptions = {}) {
  if (!user.id || !Number.isInteger(user.id) || user.id <= 0) {
    throw new Error('Cannot create session for user without a valid id.');
  }

  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sessionId = crypto.randomUUID();
  const tokenJti = sessionId;
  const session: SessionData = {
    user: { id: user.id },
    expires: expiresInOneDay.toISOString(),
    sessionId,
    jti: tokenJti
  };

  await createAuthSessionRecord({
    sessionId,
    tokenJti,
    userId: user.id,
    expiresAt: expiresInOneDay,
    ipAddress: options.ipAddress ?? null,
    userAgent: options.userAgent ?? null,
    metadata: options.metadata ?? null
  });

  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

export async function clearSession({
  reason = 'manual_sign_out'
}: {
  reason?: string;
} = {}) {
  const cookieStore = await cookies();
  const encryptedSession = cookieStore.get('session')?.value;
  if (!encryptedSession) {
    cookieStore.delete('session');
    return;
  }

  const sessionData = await tryVerifyToken(encryptedSession);
  if (sessionData?.sessionId) {
    try {
      await revokeAuthSessionRecord({
        sessionId: sessionData.sessionId,
        reason
      });
    } catch {
      // Keep logout path resilient even when session storage is unavailable.
    }
  }

  cookieStore.delete('session');
}
