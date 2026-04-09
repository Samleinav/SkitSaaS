import assert from 'node:assert/strict';
import test from 'node:test';
import type { CheckoutOrderWithMetadata } from '@/lib/payments/checkout-orders';
import {
  isCheckoutOrderSignupIntent,
  resolveCheckoutOrderEffectiveTargetType,
  resolveCheckoutOrderSignupIntentId
} from '@/lib/payments/checkout-orders';
import {
  buildPayPalSignupIntentCustomId,
  parsePayPalSignupIntentCustomId
} from '@/lib/payments/signup-intents';

function createSignupCheckoutOrder(
  overrides: Partial<CheckoutOrderWithMetadata> = {}
): CheckoutOrderWithMetadata {
  return {
    id: 1,
    checkoutToken: 'chk_signup_123',
    orderType: 'subscription',
    status: 'ready',
    targetType: null,
    targetTeamId: null,
    targetUserId: null,
    teamId: null,
    selectedProvider: null,
    providerSessionId: null,
    providerReferenceId: null,
    parsedMetadata: {
      schemaVersion: 1,
      signupIntent: {
        intentId: 9,
        targetScope: 'organization',
        email: 'test@example.com'
      }
    },
    ...overrides
  } as CheckoutOrderWithMetadata;
}

test('signup checkout metadata resolves guest signup intent semantics', () => {
  const checkoutOrder = createSignupCheckoutOrder();

  assert.equal(resolveCheckoutOrderSignupIntentId(checkoutOrder), 9);
  assert.equal(isCheckoutOrderSignupIntent(checkoutOrder), true);
  assert.equal(resolveCheckoutOrderEffectiveTargetType(checkoutOrder), 'team');
});

test('explicit checkout target type keeps precedence over signup scope inference', () => {
  const checkoutOrder = createSignupCheckoutOrder({
    targetType: 'user',
    targetUserId: 42
  });

  assert.equal(resolveCheckoutOrderEffectiveTargetType(checkoutOrder), 'user');
});

test('paypal signup custom id round-trips signup intent and checkout token', () => {
  const customId = buildPayPalSignupIntentCustomId({
    signupIntentId: 12,
    checkoutToken: 'chk_signup_456'
  });

  assert.equal(customId, 'signup-intent:12:chk_signup_456');
  assert.deepEqual(parsePayPalSignupIntentCustomId(customId), {
    signupIntentId: 12,
    checkoutToken: 'chk_signup_456'
  });
  assert.equal(parsePayPalSignupIntentCustomId('signup-intent:nope:bad'), null);
});
