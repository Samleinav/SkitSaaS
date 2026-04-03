import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReuseCompletedOneTimeCheckoutReturn,
  canReuseCompletedPayPalOneTimeCheckoutReturn
} from '../../lib/payments/core-return-actions';
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

test('canReuseCompletedOneTimeCheckoutReturn accepts matching completed one-time orders for generic return flows', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder,
      providerSessionId: 'ORDER-123'
    }),
    true
  );

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder,
      providerReferenceId: 'CAPTURE-456'
    }),
    true
  );

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder,
      providerSessionId: null,
      providerReferenceId: null
    }),
    true
  );
});

test('canReuseCompletedOneTimeCheckoutReturn rejects mismatched or non-completed orders', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder,
      providerSessionId: 'ORDER-999',
      providerReferenceId: 'CAPTURE-999'
    }),
    false
  );

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ status: 'provider_pending' }),
      providerSessionId: 'ORDER-123'
    }),
    false
  );

  assert.equal(
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ orderType: 'subscription' }),
      providerSessionId: 'ORDER-123'
    }),
    false
  );
});

test('canReuseCompletedPayPalOneTimeCheckoutReturn remains compatible via the generic helper', () => {
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
});
