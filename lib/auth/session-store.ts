import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { authSessions } from '@/lib/db/schema';
import {
  type PersistedAuthSessionRecord,
  type PersistedAuthSessionState,
  isPersistedSessionActive,
  shouldExpirePersistedSession
} from '@/lib/auth/session-state';

type ExpirePersistedAuthSessionInput = {
  sessionId: string;
  reason?: string;
  now?: Date;
};

type RefreshPersistedAuthSessionInput = {
  sessionId: string;
  expiresAt: Date;
  now?: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuthSessionStoreBackend = {
  getByTokenJti(tokenJti: string): Promise<PersistedAuthSessionRecord | null>;
  getBySessionId(
    sessionId: string,
    userId: number
  ): Promise<PersistedAuthSessionRecord | null>;
  expire(input: ExpirePersistedAuthSessionInput): Promise<void>;
  refresh(input: RefreshPersistedAuthSessionInput): Promise<void>;
};

const defaultAuthSessionStoreBackend: AuthSessionStoreBackend = {
  async getByTokenJti(tokenJti) {
    const [session] = await db
      .select({
        id: authSessions.id,
        sessionId: authSessions.sessionId,
        userId: authSessions.userId,
        tokenJti: authSessions.tokenJti,
        status: authSessions.status,
        expiresAt: authSessions.expiresAt,
        revokedAt: authSessions.revokedAt
      })
      .from(authSessions)
      .where(eq(authSessions.tokenJti, tokenJti))
      .limit(1);

    return session ?? null;
  },
  async getBySessionId(sessionId, userId) {
    const [session] = await db
      .select({
        id: authSessions.id,
        sessionId: authSessions.sessionId,
        userId: authSessions.userId,
        tokenJti: authSessions.tokenJti,
        status: authSessions.status,
        expiresAt: authSessions.expiresAt,
        revokedAt: authSessions.revokedAt
      })
      .from(authSessions)
      .where(
        and(eq(authSessions.sessionId, sessionId), eq(authSessions.userId, userId))
      )
      .limit(1);

    return session ?? null;
  },
  async expire({ sessionId, reason = 'session_expired', now = new Date() }) {
    await db
      .update(authSessions)
      .set({
        status: 'expired',
        revokedReason: reason,
        updatedAt: now
      })
      .where(
        and(eq(authSessions.sessionId, sessionId), eq(authSessions.status, 'active'))
      );
  },
  async refresh({
    sessionId,
    expiresAt,
    now = new Date(),
    ipAddress,
    userAgent
  }) {
    await db
      .update(authSessions)
      .set({
        expiresAt,
        lastSeenAt: now,
        updatedAt: now,
        ...(ipAddress !== undefined ? { lastIpAddress: ipAddress ?? null } : {}),
        ...(userAgent !== undefined ? { userAgent: userAgent ?? null } : {})
      })
      .where(
        and(eq(authSessions.sessionId, sessionId), eq(authSessions.status, 'active'))
      );
  }
};

const AUTH_SESSION_STORE_BACKEND_KEY = Symbol.for(
  'skitsaas.auth.session-store.backend'
);

function getAuthSessionStoreBackend() {
  const globalState = globalThis as typeof globalThis & {
    [AUTH_SESSION_STORE_BACKEND_KEY]?: AuthSessionStoreBackend;
  };

  return globalState[AUTH_SESSION_STORE_BACKEND_KEY] ?? defaultAuthSessionStoreBackend;
}

export function configureAuthSessionStoreBackend(
  overrides: Partial<AuthSessionStoreBackend> | null
) {
  const globalState = globalThis as typeof globalThis & {
    [AUTH_SESSION_STORE_BACKEND_KEY]?: AuthSessionStoreBackend;
  };

  globalState[AUTH_SESSION_STORE_BACKEND_KEY] = overrides
    ? { ...defaultAuthSessionStoreBackend, ...overrides }
    : defaultAuthSessionStoreBackend;
}

export async function getPersistedAuthSessionByTokenJti(
  tokenJti: string
): Promise<PersistedAuthSessionRecord | null> {
  return getAuthSessionStoreBackend().getByTokenJti(tokenJti);
}

export async function getPersistedAuthSessionBySessionId(
  sessionId: string,
  userId: number
): Promise<PersistedAuthSessionRecord | null> {
  return getAuthSessionStoreBackend().getBySessionId(sessionId, userId);
}

export async function expirePersistedAuthSession({
  sessionId,
  reason = 'session_expired',
  now = new Date()
}: ExpirePersistedAuthSessionInput) {
  await getAuthSessionStoreBackend().expire({ sessionId, reason, now });
}

export async function ensurePersistedAuthSessionActive(
  persistedSession: (PersistedAuthSessionState & { sessionId?: string | null }) | null,
  {
    tokenJti,
    sessionId,
    now = new Date()
  }: {
    tokenJti?: string | null;
    sessionId?: string | null;
    now?: Date;
  } = {}
) {
  if (isPersistedSessionActive(persistedSession, { tokenJti, now })) {
    return true;
  }

  const effectiveSessionId = sessionId ?? persistedSession?.sessionId ?? null;
  if (effectiveSessionId && shouldExpirePersistedSession(persistedSession, now)) {
    await expirePersistedAuthSession({
      sessionId: effectiveSessionId,
      reason: 'session_expired',
      now
    });
  }

  return false;
}

export async function getActivePersistedAuthSessionByTokenJti(
  tokenJti: string,
  { now = new Date() }: { now?: Date } = {}
): Promise<PersistedAuthSessionRecord | null> {
  const session = await getPersistedAuthSessionByTokenJti(tokenJti);
  if (!(await ensurePersistedAuthSessionActive(session, { tokenJti, now }))) {
    return null;
  }

  return session;
}

export async function refreshPersistedAuthSession({
  sessionId,
  expiresAt,
  now = new Date(),
  ipAddress,
  userAgent
}: RefreshPersistedAuthSessionInput) {
  await getAuthSessionStoreBackend().refresh({
    sessionId,
    expiresAt,
    now,
    ipAddress,
    userAgent
  });
}
