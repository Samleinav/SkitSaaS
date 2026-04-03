import assert from 'node:assert/strict';
import test from 'node:test';
import type { CheckoutOrder } from '../../lib/db/schema';
import {
  resolveCheckoutProviderPendingStartReuse,
  resolveCoreCheckoutLegacyActionPath,
  type ResolvedCheckoutPaymentMethod
} from '../../lib/payments/payment-methods';
import type { CheckoutOrderWithMetadata } from '../../lib/payments/checkout-orders';

function buildCheckoutOrder(
  patch: Partial<CheckoutOrderWithMetadata> = {}
): CheckoutOrderWithMetadata {
  const baseOrder: CheckoutOrder = {
    id: 1,
    checkoutToken: 'tok_provider_pending',
    idempotencyKey: 'idem_provider_pending',
    orderType: 'subscription',
    status: 'provider_pending',
    source: 'pricing',
    moduleId: null,
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    targetUserId: null,
    subscriptionTemplateId: 200,
    selectedProvider: 'paypal',
    selectedPaymentMethod: 'paypal',
    providerSessionId: 'sub_test_123',
    providerReferenceId: null,
    amount: 1000,
    currency: 'USD',
    planName: 'Starter',
    metadata: null,
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    canceledAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return {
    ...baseOrder,
    parsedMetadata: null,
    ...patch
  };
}

test('resolveCoreCheckoutLegacyActionPath maps core methods and callback actions', () => {
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'paypal',
      action: 'cancel'
    }),
    '/api/paypal/checkout/cancel'
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'paypal',
      action: 'return'
    }),
    '/api/paypal/checkout'
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'paypal',
      action: 'webhook'
    }),
    '/api/paypal/webhook'
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'stripe',
      action: 'return'
    }),
    '/api/stripe/checkout'
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'stripe',
      action: 'webhook'
    }),
    '/api/stripe/webhook'
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'stripe',
      action: 'cancel'
    }),
    null
  );
  assert.equal(
    resolveCoreCheckoutLegacyActionPath({
      paymentMethodId: 'unknown',
      action: 'return'
    }),
    null
  );
});

test('resolveCheckoutProviderPendingStartReuse reuses provider_pending paypal checkout order', async () => {
  const checkoutOrder = buildCheckoutOrder({
    status: 'provider_pending',
    selectedProvider: 'paypal',
    selectedPaymentMethod: 'paypal',
    providerSessionId: 'sub_test_123'
  });
  const paypalMethod: ResolvedCheckoutPaymentMethod = {
    paymentMethodId: 'paypal',
    ownerType: 'core',
    moduleId: null,
    displayName: 'PayPal',
    description: 'Core PayPal subscription checkout adapter.',
    order: 20,
    supportsOrderTypes: ['subscription'],
    supportsTargetTypes: ['team'],
    routes: {
      startPath: '/api/checkout/{checkoutToken}/pay/paypal',
      cancelPath: '/api/checkout/methods/paypal/cancel',
      returnPath: '/api/checkout/methods/paypal/return',
      webhookPath: '/api/checkout/methods/paypal/webhook'
    },
    metadata: null
  };

  const result = await resolveCheckoutProviderPendingStartReuse({
    paymentMethod: paypalMethod,
    checkoutOrder
  });

  assert.ok(result);
  assert.equal(result?.status, 'provider_pending');
  assert.equal(result?.redirectUrl, null);
  assert.deepEqual(result?.clientPayload, {
    idempotencyReused: true,
    providerSessionId: 'sub_test_123'
  });
});
