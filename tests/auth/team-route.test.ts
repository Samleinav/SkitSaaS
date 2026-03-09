import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

test('team route returns 404 when teams are disabled', async () => {
  const previousTeamsEnabled = process.env.TEAMS_ENABLED;
  process.env.TEAMS_ENABLED = 'false';

  try {
    const { GET } = await import('../../app/api/team/route');
    const response = await GET(new NextRequest('http://localhost/api/team'));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'Team system is disabled.'
    });
  } finally {
    if (previousTeamsEnabled === undefined) {
      delete process.env.TEAMS_ENABLED;
    } else {
      process.env.TEAMS_ENABLED = previousTeamsEnabled;
    }
  }
});
