import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseCreateOneTimeCheckoutIntentInput,
  parseOneTimeIntentId
} from '../../modules/mod.commerce.one-time-payments/src/validators';

test('one-time checkout validator requires productId', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    quantity: 1
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.code, 'invalid_product_id');
  }
});

test('one-time checkout validator requires targetTeamId for team target', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: 10,
    targetType: 'team'
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.code, 'target_team_required');
  }
});

test('one-time checkout validator rejects targetTeamId for user target', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: 10,
    targetType: 'user',
    targetTeamId: 88
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.code, 'target_team_not_allowed_for_user_target');
  }
});

test('one-time checkout validator normalizes defaults', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: '12'
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.productId, 12);
    assert.equal(parsed.value.quantity, 1);
    assert.equal(parsed.value.provider, 'stripe');
    assert.equal(parsed.value.checkoutMode, 'provider_session');
    assert.equal(parsed.value.targetType, 'user');
    assert.equal(parsed.value.targetTeamId, null);
  }
});

test('one-time checkout validator accepts core checkout mode', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: 12,
    checkoutMode: 'core_checkout'
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.checkoutMode, 'core_checkout');
    assert.equal(parsed.value.provider, null);
  }
});

test('one-time checkout validator accepts paypal provider', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: 12,
    provider: 'paypal'
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.provider, 'paypal');
  }
});

test('one-time checkout validator accepts null metadata', () => {
  const parsed = parseCreateOneTimeCheckoutIntentInput({
    productId: 12,
    metadata: null
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.metadata, null);
  }
});

test('one-time intent id validator rejects invalid ids', () => {
  const parsed = parseOneTimeIntentId('invalid');

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.code, 'invalid_intent_id');
  }
});
