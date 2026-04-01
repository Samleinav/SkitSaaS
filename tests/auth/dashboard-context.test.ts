import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import {
  authContextInternals,
  getUserContext
} from '../../lib/auth/contexts';
import type { User } from '../../lib/db/schema';

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: 'member',
    accountStatus: 'active',
    statusReason: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides
  };
}

test('getUserContext returns system_admin for admin users', async () => {
  const findFirstMock = mock.method(
    authContextInternals,
    'getTeamMembership',
    async () => null
  );

  try {
    const context = await getUserContext(createUser({ role: 'admin' }));
    assert.deepEqual(context, { type: 'system_admin' });
    assert.equal(findFirstMock.mock.calls.length, 0);
  } finally {
    findFirstMock.mock.restore();
  }
});

test('getUserContext returns team_member when membership exists', async () => {
  const findFirstMock = mock.method(
    authContextInternals,
    'getTeamMembership',
    async () => ({
      teamId: 7,
      role: 'owner'
    })
  );

  try {
    const context = await getUserContext(createUser({ id: 99 }));
    assert.deepEqual(context, {
      type: 'team_member',
      teamId: 7,
      memberRole: 'owner'
    });
    assert.equal(findFirstMock.mock.calls.length, 1);
  } finally {
    findFirstMock.mock.restore();
  }
});

test('getUserContext returns standalone when teams are disabled', async () => {
  const previousTeamsEnabled = process.env.TEAMS_ENABLED;
  process.env.TEAMS_ENABLED = 'false';

  const findFirstMock = mock.method(
    authContextInternals,
    'getTeamMembership',
    async () => ({
      teamId: 7,
      role: 'owner'
    })
  );

  try {
    const context = await getUserContext(createUser({ id: 88 }));
    assert.deepEqual(context, {
      type: 'standalone',
      userId: 88
    });
    assert.equal(findFirstMock.mock.calls.length, 0);
  } finally {
    if (previousTeamsEnabled === undefined) {
      delete process.env.TEAMS_ENABLED;
    } else {
      process.env.TEAMS_ENABLED = previousTeamsEnabled;
    }
    findFirstMock.mock.restore();
  }
});

test('getUserContext returns standalone for authenticated users without team', async () => {
  const findFirstMock = mock.method(
    authContextInternals,
    'getTeamMembership',
    async () => null
  );

  try {
    const context = await getUserContext(createUser({ id: 123 }));
    assert.deepEqual(context, {
      type: 'standalone',
      userId: 123
    });
    assert.equal(findFirstMock.mock.calls.length, 1);
  } finally {
    findFirstMock.mock.restore();
  }
});

test('getUserContext returns public without authenticated user', async () => {
  const findFirstMock = mock.method(
    authContextInternals,
    'getTeamMembership',
    async () => null
  );

  try {
    const context = await getUserContext(null);
    assert.deepEqual(context, { type: 'public' });
    assert.equal(findFirstMock.mock.calls.length, 0);
  } finally {
    findFirstMock.mock.restore();
  }
});
