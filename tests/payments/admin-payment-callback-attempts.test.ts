import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCheckoutCallbackMetrics,
  getCheckoutCallbackOutcome,
  type AdminCheckoutCallbackAttemptRow
} from '../../app/(dashboard)/admin/payments/callback-attempts';

function createAttemptRow(
  overrides: Partial<AdminCheckoutCallbackAttemptRow>
): AdminCheckoutCallbackAttemptRow {
  return {
    id: 1,
    checkoutOrderId: 10,
    checkoutToken: 'chk_test_123',
    paymentMethodId: 'paypal',
    provider: 'paypal',
    ownerType: 'core',
    moduleId: null,
    orderType: 'subscription',
    source: 'webhook',
    eventType: 'webhook_succeeded',
    status: 'success',
    teamId: 2,
    targetType: 'team',
    targetTeamId: 2,
    targetUserId: null,
    providerSessionId: 'ORDER-1',
    providerReferenceId: 'SUBSCRIPTION-1',
    externalOrderId: null,
    externalPaymentId: null,
    message: null,
    metadata: null,
    createdAt: new Date('2026-04-02T00:00:00.000Z'),
    teamName: 'Acme',
    ...overrides
  };
}

test('getCheckoutCallbackOutcome classifies explicit callback outcomes safely', () => {
  assert.equal(getCheckoutCallbackOutcome('return_replayed'), 'replayed');
  assert.equal(
    getCheckoutCallbackOutcome('webhook_provider_pending'),
    'provider_pending'
  );
  assert.equal(getCheckoutCallbackOutcome('return_failed'), 'failed');
  assert.equal(getCheckoutCallbackOutcome('webhook_ignored'), 'ignored');
  assert.equal(getCheckoutCallbackOutcome('return_succeeded'), 'succeeded');
  assert.equal(getCheckoutCallbackOutcome('webhook_received'), 'unknown');
});

test('getCheckoutCallbackMetrics counts recent callback outcomes for admin summaries', () => {
  const metrics = getCheckoutCallbackMetrics([
    createAttemptRow({ eventType: 'return_replayed' }),
    createAttemptRow({ id: 2, eventType: 'webhook_provider_pending' }),
    createAttemptRow({ id: 3, eventType: 'return_failed' }),
    createAttemptRow({ id: 4, eventType: 'webhook_succeeded' }),
    createAttemptRow({ id: 5, eventType: 'webhook_received' })
  ]);

  assert.deepEqual(metrics, {
    total: 5,
    replayed: 1,
    providerPending: 1,
    failed: 1
  });
});
