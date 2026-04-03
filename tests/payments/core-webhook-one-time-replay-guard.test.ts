import assert from 'node:assert/strict';
import test from 'node:test';
import { canReuseConvergedOneTimeCheckoutWebhook } from '../../lib/payments/core-webhook-actions';
import type { CheckoutOrderWithMetadata } from '../../lib/payments/checkout-orders';

function createCheckoutOrder(
  overrides: Partial<CheckoutOrderWithMetadata>
): CheckoutOrderWithMetadata {
  return {
    id: 1,
    checkoutToken: 'chk_test_123',
    orderType: 'one_time',
    status: 'completed',
    selectedProvider: 'paypal',
    providerSessionId: 'ORDER-123',
    providerReferenceId: 'CAPTURE-456',
    parsedMetadata: null,
    ...overrides
  } as CheckoutOrderWithMetadata;
}

test('canReuseConvergedOneTimeCheckoutWebhook accepts matching completed or failed provider states', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123',
      providerReferenceId: 'CAPTURE-456'
    }),
    true
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({
        status: 'failed',
        providerReferenceId: 'CAPTURE-FAILED'
      }),
      provider: 'paypal',
      nextStatus: 'failed',
      providerReferenceId: 'CAPTURE-FAILED'
    }),
    true
  );
});

test('canReuseConvergedOneTimeCheckoutWebhook accepts matching provider_pending state by session', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({
        status: 'provider_pending',
        providerReferenceId: null
      }),
      provider: 'paypal',
      nextStatus: 'provider_pending',
      providerSessionId: 'ORDER-123'
    }),
    true
  );
});

test('canReuseConvergedOneTimeCheckoutWebhook rejects mismatched status, provider, or identifiers', () => {
  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'stripe',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({ status: 'provider_pending' }),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({}),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-999',
      providerReferenceId: 'CAPTURE-999'
    }),
    false
  );

  assert.equal(
    canReuseConvergedOneTimeCheckoutWebhook({
      checkoutOrder: createCheckoutOrder({ orderType: 'subscription' }),
      provider: 'paypal',
      nextStatus: 'completed',
      providerSessionId: 'ORDER-123'
    }),
    false
  );
});
