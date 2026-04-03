import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureCheckoutPaymentAttemptLogWriter,
  createCheckoutPaymentAttemptLog
} from '../../lib/payments/attempt-logs';

test('createCheckoutPaymentAttemptLog writes normalized entries through the configured writer', async () => {
  const writes: Array<Record<string, unknown>> = [];
  configureCheckoutPaymentAttemptLogWriter(async (entry) => {
    writes.push(entry as Record<string, unknown>);
  });

  try {
    await createCheckoutPaymentAttemptLog({
      checkoutOrderId: 18,
      checkoutToken: ' tok_checkout_1 ',
      paymentMethodId: ' stripe ',
      provider: ' stripe ',
      ownerType: 'core',
      orderType: 'subscription',
      source: ' checkout ',
      eventType: ' start_requested ',
      status: 'success',
      teamId: 9,
      targetType: 'team',
      targetTeamId: 9,
      targetUserId: 77,
      providerSessionId: ' cs_test_123 ',
      message: ' Checkout payment start requested. ',
      metadata: {
        hasRedirectUrl: true
      }
    });

    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.checkoutOrderId, 18);
    assert.equal(writes[0]?.checkoutToken, 'tok_checkout_1');
    assert.equal(writes[0]?.paymentMethodId, 'stripe');
    assert.equal(writes[0]?.provider, 'stripe');
    assert.equal(writes[0]?.ownerType, 'core');
    assert.equal(writes[0]?.orderType, 'subscription');
    assert.equal(writes[0]?.source, 'checkout');
    assert.equal(writes[0]?.eventType, 'start_requested');
    assert.equal(writes[0]?.targetType, 'team');
    assert.equal(writes[0]?.targetTeamId, 9);
    assert.equal(writes[0]?.targetUserId, null);
    assert.equal(writes[0]?.providerSessionId, 'cs_test_123');
    assert.equal(writes[0]?.message, 'Checkout payment start requested.');
    assert.equal(
      writes[0]?.metadata,
      JSON.stringify({ hasRedirectUrl: true })
    );
  } finally {
    configureCheckoutPaymentAttemptLogWriter(null);
  }
});

test('createCheckoutPaymentAttemptLog fails open and leaves console evidence when the sink throws', async () => {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  configureCheckoutPaymentAttemptLogWriter(async () => {
    throw new Error('attempt_sink_down');
  });

  try {
    await createCheckoutPaymentAttemptLog({
      checkoutOrderId: 44,
      paymentMethodId: 'paypal',
      provider: 'paypal',
      eventType: 'return_received'
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], 'Unable to persist checkout payment attempt log:');
    const payload = calls[0]?.[1] as {
      eventType?: string;
      paymentMethodId?: string;
      checkoutOrderId?: number | null;
      error?: unknown;
    };
    assert.equal(payload?.eventType, 'return_received');
    assert.equal(payload?.paymentMethodId, 'paypal');
    assert.equal(payload?.checkoutOrderId, 44);
    assert.ok(payload?.error instanceof Error);
  } finally {
    configureCheckoutPaymentAttemptLogWriter(null);
    console.error = originalConsoleError;
  }
});
