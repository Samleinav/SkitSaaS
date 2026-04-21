import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparePrimaryTeamMembership,
  pickPrimaryTeamMembership
} from '../../lib/db/team-memberships';

test('pickPrimaryTeamMembership prefers owner memberships first', () => {
  const selected = pickPrimaryTeamMembership([
    {
      id: 10,
      teamId: 4,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    },
    {
      id: 11,
      teamId: 9,
      role: 'Owner',
      joinedAt: new Date('2026-04-10T00:00:00.000Z')
    }
  ]);

  assert.equal(selected?.id, 11);
});

test('pickPrimaryTeamMembership keeps deterministic fallback ordering', () => {
  const selected = pickPrimaryTeamMembership([
    {
      id: 40,
      teamId: 8,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    },
    {
      id: 39,
      teamId: 7,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    },
    {
      id: 41,
      teamId: 7,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    },
    {
      id: 12,
      teamId: 3,
      role: 'member',
      joinedAt: new Date('2026-02-10T00:00:00.000Z')
    }
  ]);

  assert.equal(selected?.id, 12);
});

test('comparePrimaryTeamMembership uses record id as the final tie breaker', () => {
  const result = comparePrimaryTeamMembership(
    {
      id: 8,
      teamId: 3,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    },
    {
      id: 9,
      teamId: 3,
      role: 'member',
      joinedAt: new Date('2026-03-10T00:00:00.000Z')
    }
  );

  assert.equal(result < 0, true);
});

test('pickPrimaryTeamMembership returns null for empty memberships', () => {
  assert.equal(pickPrimaryTeamMembership([]), null);
});
