import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultTeamNameFromEmail } from '@/lib/organizations/default-team-name';

test('buildDefaultTeamNameFromEmail keeps generated names inside teams.name length', () => {
  const longEmail = `${'averylonglocalpart'.repeat(8)}@example.com`;
  const teamName = buildDefaultTeamNameFromEmail(longEmail);

  assert.equal(teamName.endsWith("'s Team"), true);
  assert.equal(teamName.length <= 100, true);
});
