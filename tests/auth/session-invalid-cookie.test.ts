import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';

const TEST_AUTH_SECRET = 'test_auth_secret_session_invalid_cookie';

async function loadSessionModule() {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  return await import('../../lib/auth/session');
}

test('tryVerifyToken returns null for malformed token', async () => {
  const { tryVerifyToken } = await loadSessionModule();
  const session = await tryVerifyToken('not-a-token');
  assert.equal(session, null);
});

test('tryVerifyToken returns null for token signed with another secret', async () => {
  const { tryVerifyToken } = await loadSessionModule();
  const forgedKey = new TextEncoder().encode('another_test_secret');
  const forgedToken = await new SignJWT({
    user: { id: 123 },
    expires: new Date(Date.now() + 60_000).toISOString()
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(forgedKey);

  const session = await tryVerifyToken(forgedToken);
  assert.equal(session, null);
});

test('tryVerifyToken returns null for expired token', async () => {
  const { tryVerifyToken } = await loadSessionModule();
  const expiredKey = new TextEncoder().encode(TEST_AUTH_SECRET);
  const expiredToken = await new SignJWT({
    user: { id: 456 },
    expires: new Date(Date.now() - 60_000).toISOString()
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('-1s')
    .sign(expiredKey);

  const session = await tryVerifyToken(expiredToken);
  assert.equal(session, null);
});

test('tryVerifyToken keeps valid-token behavior unchanged', async () => {
  const { signToken, tryVerifyToken } = await loadSessionModule();
  const token = await signToken({
    user: { id: 99 },
    expires: new Date(Date.now() + 5 * 60_000).toISOString()
  });

  const session = await tryVerifyToken(token);
  assert.ok(session);
  assert.equal(session?.user.id, 99);
});

test('signToken preserves session identifiers for revocation-aware flows', async () => {
  const { signToken, tryVerifyToken } = await loadSessionModule();
  const token = await signToken({
    user: { id: 33 },
    expires: new Date(Date.now() + 60_000).toISOString(),
    sessionId: 'session_abc_123',
    jti: 'session_abc_123'
  });

  const session = await tryVerifyToken(token);
  assert.ok(session);
  assert.equal(session?.sessionId, 'session_abc_123');
  assert.equal(session?.jti, 'session_abc_123');
});

test('isSessionExpired handles valid and invalid values defensively', async () => {
  const { isSessionExpired } = await loadSessionModule();
  assert.equal(
    isSessionExpired({
      expires: new Date(Date.now() + 60_000).toISOString()
    }),
    false
  );
  assert.equal(
    isSessionExpired({
      expires: new Date(Date.now() - 60_000).toISOString()
    }),
    true
  );
  assert.equal(isSessionExpired({ expires: 'invalid-date' }), true);
  assert.equal(isSessionExpired(null), true);
});

test('isPersistedSessionActive enforces revocation, expiry, and jti checks', async () => {
  const { isPersistedSessionActive } = await loadSessionModule();
  const now = new Date('2026-02-16T12:00:00.000Z');

  assert.equal(
    isPersistedSessionActive(
      {
        status: 'active',
        revokedAt: null,
        expiresAt: new Date('2026-02-16T12:05:00.000Z'),
        tokenJti: 'session_1'
      },
      { tokenJti: 'session_1', now }
    ),
    true
  );

  assert.equal(
    isPersistedSessionActive(
      {
        status: 'revoked',
        revokedAt: null,
        expiresAt: new Date('2026-02-16T12:05:00.000Z'),
        tokenJti: 'session_1'
      },
      { tokenJti: 'session_1', now }
    ),
    false
  );

  assert.equal(
    isPersistedSessionActive(
      {
        status: 'active',
        revokedAt: new Date('2026-02-16T11:00:00.000Z'),
        expiresAt: new Date('2026-02-16T12:05:00.000Z'),
        tokenJti: 'session_1'
      },
      { tokenJti: 'session_1', now }
    ),
    false
  );

  assert.equal(
    isPersistedSessionActive(
      {
        status: 'active',
        revokedAt: null,
        expiresAt: new Date('2026-02-16T11:55:00.000Z'),
        tokenJti: 'session_1'
      },
      { tokenJti: 'session_1', now }
    ),
    false
  );

  assert.equal(
    isPersistedSessionActive(
      {
        status: 'active',
        revokedAt: null,
        expiresAt: new Date('2026-02-16T12:05:00.000Z'),
        tokenJti: 'session_1'
      },
      { tokenJti: 'session_2', now }
    ),
    false
  );
});
