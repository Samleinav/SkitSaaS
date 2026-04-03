import assert from 'node:assert/strict';
import test from 'node:test';
import { canReuseCompletedPayPalOneTimeCheckoutReturn } from '../../lib/payments/core-return-actions';
import type { CheckoutOrderWithMetadata } from '../../lib/payments/checkout-orders';

function createCheckoutOrder(
  overrides: Partial<CheckoutOrderWithMetadata>
): CheckoutOrderWithMetadata {
  return {
    id: 1,
    checkoutToken: 'chk_test_123',
    orderType: 'one_time',
    status: 'completed',
    providerSessionId: 'ORDER-123',
    providerReferenceId: 'CAPTURE-456',
    parsedMetadata: null,
    ...overrides
  } as CheckoutOrderWithMetadata;
}

test('canReuseCompletedPayPalOneTimeCheckoutReturn accepts matching completed one-time orders', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder,
      orderId: 'ORDER-123'
    }),
    true
  );

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder,
      orderId: 'CAPTURE-456'
    }),
    true
  );

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder,
      orderId: null
    }),
    true
  );
});

test('canReuseCompletedPayPalOneTimeCheckoutReturn rejects mismatched or non-completed orders', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder,
      orderId: 'ORDER-999'
    }),
    false
  );

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ status: 'provider_pending' }),
      orderId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ orderType: 'subscription' }),
      orderId: 'ORDER-123'
    }),
    false
  );
});
