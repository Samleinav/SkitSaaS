export type SessionData = {
  user: { id: number };
  expires: string;
  sessionId?: string;
  jti?: string;
};

export type PersistedAuthSessionState = {
  status: string | null | undefined;
  revokedAt: Date | null;
  expiresAt: Date | null;
  tokenJti?: string | null;
};

export type PersistedAuthSessionRecord = PersistedAuthSessionState & {
  id: number;
  sessionId: string;
  userId: number;
};

export function isSessionExpired(sessionData: Pick<SessionData, 'expires'> | null) {
  if (!sessionData?.expires) {
    return true;
  }

  const expiresAt = new Date(sessionData.expires);
  if (Number.isNaN(expiresAt.getTime())) {
    return true;
  }

  return expiresAt <= new Date();
}

export function isPersistedSessionActive(
  persistedSession: PersistedAuthSessionState | null,
  {
    tokenJti,
    now = new Date()
  }: {
    tokenJti?: string | null;
    now?: Date;
  } = {}
) {
  if (!persistedSession) {
    return false;
  }

  if (persistedSession.status !== 'active') {
    return false;
  }

  if (persistedSession.revokedAt) {
    return false;
  }

  const expiresAt = persistedSession.expiresAt;
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  if (expiresAt <= now) {
    return false;
  }

  const normalizedTokenJti = tokenJti?.trim();
  if (
    normalizedTokenJti &&
    persistedSession.tokenJti &&
    persistedSession.tokenJti !== normalizedTokenJti
  ) {
    return false;
  }

  return true;
}

export function shouldExpirePersistedSession(
  persistedSession: PersistedAuthSessionState | null,
  now = new Date()
) {
  if (!persistedSession) {
    return false;
  }

  if (persistedSession.status !== 'active' || persistedSession.revokedAt) {
    return false;
  }

  const expiresAt = persistedSession.expiresAt;
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt <= now;
}
