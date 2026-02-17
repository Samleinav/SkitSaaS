import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSubscriptionOrderTargetIds,
  type SubscriptionOrderTargetInput
} from '../../lib/payments/order-targets';

test('collectSubscriptionOrderTargetIds resolves team and user targets from order metadata', () => {
  const orders: SubscriptionOrderTargetInput[] = [
    {
      teamId: 12,
      metadata: null
    },
    {
      teamId: null,
      metadata: JSON.stringify({
        targetType: 'user',
        userId: 33
      })
    },
    {
      teamId: null,
      metadata: JSON.stringify({
        checkoutContext: {
          providerMetadata: {
            system: {
              targetType: 'team',
              teamId: 24
            }
          }
        }
      })
    },
    {
      teamId: 12,
      metadata: JSON.stringify({
        targetType: 'user',
        userId: 33
      })
    }
  ];

  const result = collectSubscriptionOrderTargetIds(orders);

  assert.deepEqual(result.teamIds.sort((a, b) => a - b), [12, 24]);
  assert.deepEqual(result.userIds.sort((a, b) => a - b), [33]);
});
