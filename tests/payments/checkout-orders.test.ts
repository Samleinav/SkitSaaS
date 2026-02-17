import assert from 'node:assert/strict';
import test from 'node:test';
import type { CheckoutOrder } from '../../lib/db/schema';
import {
  buildCheckoutOrderPath,
  buildCheckoutOrderUrl,
  isReusableSubscriptionCheckoutOrderForContext,
  isCheckoutOrderPayable,
  parseCheckoutOrderMetadata,
  type CheckoutOrderWithMetadata
} from '../../lib/payments/checkout-orders';

function buildCheckoutOrder(
  patch: Partial<CheckoutOrderWithMetadata> = {}
): CheckoutOrderWithMetadata {
  const baseOrder: CheckoutOrder = {
    id: 1,
    checkoutToken: 'tok_test_123',
    idempotencyKey: 'idem_test_123',
    orderType: 'subscription',
    status: 'ready',
    source: 'pricing',
    moduleId: null,
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    targetUserId: null,
    subscriptionTemplateId: 200,
    selectedProvider: null,
    selectedPaymentMethod: null,
    providerSessionId: null,
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

test('parseCheckoutOrderMetadata returns null for invalid payload', () => {
  assert.equal(parseCheckoutOrderMetadata(null), null);
  assert.equal(parseCheckoutOrderMetadata(''), null);
  assert.equal(parseCheckoutOrderMetadata('not-json'), null);
});

test('parseCheckoutOrderMetadata returns parsed object for valid payload', () => {
  const metadata = parseCheckoutOrderMetadata(
    JSON.stringify({
      schemaVersion: 1,
      subscription: {
        changeMode: 'immediate'
      }
    })
  );

  assert.ok(metadata);
  assert.equal(metadata?.schemaVersion, 1);
});

test('buildCheckoutOrderPath returns encoded checkout route', () => {
  assert.equal(buildCheckoutOrderPath('tok_test_123'), '/checkout/tok_test_123');
  assert.equal(
    buildCheckoutOrderPath('tok/with/slash'),
    '/checkout/tok%2Fwith%2Fslash'
  );
  assert.equal(buildCheckoutOrderPath(''), null);
});

test('buildCheckoutOrderUrl resolves absolute URL from explicit origin', () => {
  const url = buildCheckoutOrderUrl({
    checkoutToken: 'tok_test_123',
    origin: 'https://app.example.com'
  });
  assert.equal(url, 'https://app.example.com/checkout/tok_test_123');
});

test('buildCheckoutOrderUrl falls back to checkout path when no valid origin is provided', () => {
  const previousBaseUrl = process.env.BASE_URL;
  delete process.env.BASE_URL;

  try {
    const url = buildCheckoutOrderUrl({
      checkoutToken: 'tok_test_123',
      origin: 'invalid-origin'
    });
    assert.equal(url, '/checkout/tok_test_123');
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.BASE_URL;
    } else {
      process.env.BASE_URL = previousBaseUrl;
    }
  }
});

test('isCheckoutOrderPayable validates status and expiration', () => {
  const payable = buildCheckoutOrder();
  assert.equal(isCheckoutOrderPayable(payable), true);

  const completed = buildCheckoutOrder({ status: 'completed' });
  assert.equal(isCheckoutOrderPayable(completed), false);

  const expired = buildCheckoutOrder({
    expiresAt: new Date(Date.now() - 1_000)
  });
  assert.equal(isCheckoutOrderPayable(expired), false);
});

test('isReusableSubscriptionCheckoutOrderForContext accepts matching payable subscription order', () => {
  const reusableOrder = buildCheckoutOrder({
    orderType: 'subscription',
    status: 'ready',
    teamId: 10,
    targetType: 'team',
    targetTeamId: 10,
    subscriptionTemplateId: 200,
    parsedMetadata: {
      schemaVersion: 1,
      subscription: {
        templateSnapshot: {
          templateId: 200,
          templateName: 'Starter',
          targetScope: 'organization',
          billingInterval: 'monthly',
          priceCents: 1000,
          compareAtPriceCents: null,
          currency: 'USD',
          trialPeriodDays: 0,
          updatedAt: new Date().toISOString(),
          fingerprint: 'fingerprint'
        },
        changeMode: 'period_end',
        currentAssignmentId: null,
        currentTemplateId: null,
        scheduledStartTime: '2026-03-01T00:00:00.000Z'
      }
    }
  });

  const canReuse = isReusableSubscriptionCheckoutOrderForContext({
    order: reusableOrder,
    teamId: 10,
    templateId: 200,
    changeMode: 'period_end',
    scheduledStartTime: '2026-03-01T00:00:00.000Z'
  });

  assert.equal(canReuse, true);
});

test('isReusableSubscriptionCheckoutOrderForContext rejects non-matching context', () => {
  const order = buildCheckoutOrder({
    parsedMetadata: {
      schemaVersion: 1,
      subscription: {
        templateSnapshot: {
          templateId: 200,
          templateName: 'Starter',
          targetScope: 'organization',
          billingInterval: 'monthly',
          priceCents: 1000,
          compareAtPriceCents: null,
          currency: 'USD',
          trialPeriodDays: 0,
          updatedAt: new Date().toISOString(),
          fingerprint: 'fingerprint'
        },
        changeMode: 'immediate',
        currentAssignmentId: null,
        currentTemplateId: null,
        scheduledStartTime: null
      }
    }
  });

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order: {
        ...order,
        status: 'failed'
      },
      teamId: 10,
      templateId: 200,
      changeMode: 'immediate'
    }),
    false
  );

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order,
      teamId: 10,
      templateId: 201,
      changeMode: 'immediate'
    }),
    false
  );

  assert.equal(
    isReusableSubscriptionCheckoutOrderForContext({
      order,
      teamId: 10,
      templateId: 200,
      changeMode: 'period_end'
    }),
    false
  );
});
