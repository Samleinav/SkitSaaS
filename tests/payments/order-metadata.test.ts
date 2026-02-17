import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePaymentOrderMetadata,
  resolvePaymentOrderTarget
} from '../../lib/payments/order-metadata';

test('parsePaymentOrderMetadata returns null for invalid JSON payload', () => {
  assert.equal(parsePaymentOrderMetadata('{invalid-json'), null);
});

test('resolvePaymentOrderTarget resolves team scope from organization hint', () => {
  const target = resolvePaymentOrderTarget({
    targetType: 'organization',
    teamId: 12
  });

  assert.deepEqual(target, {
    targetType: 'team',
    teamId: 12,
    userId: null
  });
});

test('resolvePaymentOrderTarget resolves user scope from checkout metadata envelope', () => {
  const target = resolvePaymentOrderTarget(
    JSON.stringify({
      checkoutContext: {
        providerMetadata: {
          system: {
            targetType: 'user',
            userId: 77
          }
        }
      }
    })
  );

  assert.deepEqual(target, {
    targetType: 'user',
    teamId: null,
    userId: 77
  });
});

