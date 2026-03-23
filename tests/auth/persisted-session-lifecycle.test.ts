import assert from 'node:assert/strict';
import test from 'node:test';

const TEST_AUTH_SECRET = 'test_auth_secret_persisted_session_lifecycle';

async function loadSessionModules() {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;

  const session = await import('@/lib/auth/session');
  const store = await import('@/lib/auth/session-store');

  return { session, store };
}

test('refreshSignedSessionToken syncs persisted session expiry when requested', async () => {
  const { session, store } = await loadSessionModules();
  const now = Date.now();
  const originalToken = await session.signToken({
    user: { id: 77 },
    expires: new Date(now + 60_000).toISOString(),
    sessionId: 'session_refresh_77',
    jti: 'session_refresh_77'
  });

  const updates: Array<Record<string, unknown>> = [];
  store.configureAuthSessionStoreBackend({
    async getByTokenJti() {
      return {
        id: 1,
        sessionId: 'session_refresh_77',
        userId: 77,
        status: 'active',
        revokedAt: null,
        expiresAt: new Date(now + 60_000),
        tokenJti: 'session_refresh_77'
      };
    },
    async refresh(values) {
      updates.push(values as Record<string, unknown>);
    }
  });

  try {
    const refreshed = await session.refreshSignedSessionToken(originalToken, now, {
      syncPersistedSession: true,
      ipAddress: '127.0.0.1',
      userAgent: 'persisted-session-test'
    });

    assert.ok(refreshed);
    assert.equal(updates.length, 1);
    assert.ok((updates[0] as { expiresAt?: unknown }).expiresAt instanceof Date);
    assert.ok(
      ((updates[0] as { expiresAt: Date }).expiresAt).getTime() > now + 60_000
    );
    assert.equal(
      (updates[0] as { ipAddress?: string | null }).ipAddress,
      '127.0.0.1'
    );
    assert.equal(
      (updates[0] as { userAgent?: string | null }).userAgent,
      'persisted-session-test'
    );
  } finally {
    store.configureAuthSessionStoreBackend(null);
  }
});

test('ensurePersistedAuthSessionActive marks stale active sessions as expired', async () => {
  const { store } = await loadSessionModules();
  const updates: Array<Record<string, unknown>> = [];
  store.configureAuthSessionStoreBackend({
    async expire(values) {
      updates.push(values as Record<string, unknown>);
    }
  });

  try {
    const allowed = await store.ensurePersistedAuthSessionActive(
      {
        sessionId: 'expired_session_1',
        status: 'active',
        revokedAt: null,
        expiresAt: new Date('2026-03-23T09:59:00.000Z'),
        tokenJti: 'expired_session_1'
      },
      {
        tokenJti: 'expired_session_1',
        now: new Date('2026-03-23T10:00:00.000Z')
      }
    );

    assert.equal(allowed, false);
    assert.equal(updates.length, 1);
    assert.equal(
      (updates[0] as { reason?: string }).reason,
      'session_expired'
    );
    assert.equal(
      (updates[0] as { sessionId?: string }).sessionId,
      'expired_session_1'
    );
  } finally {
    store.configureAuthSessionStoreBackend(null);
  }
});

test('ensurePersistedAuthSessionActive rejects revoked persisted sessions without mutating them', async () => {
  const { store } = await loadSessionModules();
  const updates: Array<Record<string, unknown>> = [];
  store.configureAuthSessionStoreBackend({
    async expire(values) {
      updates.push(values as Record<string, unknown>);
    }
  });

  try {
    const allowed = await store.ensurePersistedAuthSessionActive(
      {
        sessionId: 'revoked_session_42',
        status: 'revoked',
        revokedAt: new Date('2026-03-23T09:55:00.000Z'),
        expiresAt: new Date('2026-03-23T10:05:00.000Z'),
        tokenJti: 'revoked_session_42'
      },
      {
        tokenJti: 'revoked_session_42',
        now: new Date('2026-03-23T10:00:00.000Z')
      }
    );

    assert.equal(allowed, false);
    assert.equal(updates.length, 0);
  } finally {
    store.configureAuthSessionStoreBackend(null);
  }
});
