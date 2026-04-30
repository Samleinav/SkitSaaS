import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReuseCompletedSubscriptionCheckoutReturn,
  resolveStripeExistingUserReturnAccess
} from '../../lib/payments/core-return-actions';
import type { CheckoutOrderWithMetadata } from '../../lib/payments/checkout-orders';

function createCheckoutOrder(
  overrides: Partial<CheckoutOrderWithMetadata>
): CheckoutOrderWithMetadata {
  return {
    id: 1,
    checkoutToken: 'chk_test_123',
    orderType: 'subscription',
    status: 'completed',
    selectedProvider: 'paypal',
    providerSessionId: 'SESSION-123',
    providerReferenceId: 'SUB-456',
    parsedMetadata: null,
    ...overrides
  } as CheckoutOrderWithMetadata;
}

test('canReuseCompletedSubscriptionCheckoutReturn accepts matching completed subscription orders', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder,
      provider: 'paypal',
      providerSessionId: 'SESSION-123'
    }),
    true
  );

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder,
      provider: 'paypal',
      providerReferenceId: 'SUB-456'
    }),
    true
  );

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder: createCheckoutOrder({
        selectedProvider: 'stripe',
        providerSessionId: 'cs_test_123',
        providerReferenceId: 'sub_test_456'
      }),
      provider: 'stripe',
      providerSessionId: 'cs_test_123',
      providerReferenceId: 'sub_test_456'
    }),
    true
  );
});

test('canReuseCompletedSubscriptionCheckoutReturn rejects mismatched provider, identifiers, or status', () => {
  const checkoutOrder = createCheckoutOrder({});

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder,
      provider: 'stripe',
      providerSessionId: 'SESSION-123'
    }),
    false
  );

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder,
      provider: 'paypal',
      providerSessionId: 'SESSION-999',
      providerReferenceId: 'SUB-999'
    }),
    false
  );

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ status: 'provider_pending' }),
      provider: 'paypal',
      providerSessionId: 'SESSION-123'
    }),
    false
  );

  assert.equal(
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder: createCheckoutOrder({ orderType: 'one_time' }),
      provider: 'paypal',
      providerSessionId: 'SESSION-123'
    }),
    false
  );
});

test('resolveStripeExistingUserReturnAccess requires a matching active user session', () => {
  assert.deepEqual(
    resolveStripeExistingUserReturnAccess({
      currentUserId: 42,
      sessionUserId: 42
    }),
    { ok: true }
  );

  assert.deepEqual(
    resolveStripeExistingUserReturnAccess({
      currentUserId: null,
      sessionUserId: 42
    }),
    {
      ok: false,
      statusCode: 401,
      error: 'Authentication required.',
      redirectUrl: '/login?redirect=pricing'
    }
  );

  assert.deepEqual(
    resolveStripeExistingUserReturnAccess({
      currentUserId: 99,
      sessionUserId: 42
    }),
    {
      ok: false,
      statusCode: 403,
      error: 'Stripe checkout session does not belong to the current user.',
      redirectUrl: '/error'
    }
  );

  assert.deepEqual(
    resolveStripeExistingUserReturnAccess({
      currentUserId: 42,
      sessionUserId: 0
    }),
    {
      ok: false,
      statusCode: 403,
      error: 'Stripe checkout session user is invalid.',
      redirectUrl: '/error'
    }
  );
});
