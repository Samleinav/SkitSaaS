import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeNotificationUserIds,
  resolveNotificationAudienceRecipientUserIds
} from '../../lib/notifications/audience';

test('notification service normalizes explicit user audiences', async () => {
  assert.deepEqual(normalizeNotificationUserIds([9, 4, 9, -1, 2]), [2, 4, 9]);

  const userAudience = await resolveNotificationAudienceRecipientUserIds({
    type: 'users',
    userIds: [15, 7, 15, 0]
  });

  assert.deepEqual(userAudience, [7, 15]);
});

test('notification service resolves team audiences through injected loader', async () => {
  const loaderCalls: Array<{
    teamId: number;
    recipients: string;
  }> = [];

  const teamMembersAudience = await resolveNotificationAudienceRecipientUserIds(
    {
      type: 'team',
      teamId: 18,
      recipients: 'members'
    },
    {
      listTeamAudienceUserIds: async (teamId, recipients) => {
        loaderCalls.push({ teamId, recipients });
        return [22, 11, 22];
      }
    }
  );

  const teamOwnerAudience = await resolveNotificationAudienceRecipientUserIds(
    {
      type: 'team',
      teamId: 18,
      recipients: 'owner'
    },
    {
      listTeamAudienceUserIds: async (teamId, recipients) => {
        loaderCalls.push({ teamId, recipients });
        return [5];
      }
    }
  );

  assert.deepEqual(teamMembersAudience, [11, 22]);
  assert.deepEqual(teamOwnerAudience, [5]);
  assert.deepEqual(loaderCalls, [
    {
      teamId: 18,
      recipients: 'members'
    },
    {
      teamId: 18,
      recipients: 'owner'
    }
  ]);
});
