import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseCommerceProductPublicationPayload,
  parseCreateCommerceProductInput,
  parseProductId,
  parseUpdateCommerceProductInput
} from '../../modules/mod.commerce.products/src/validators';

test('products validator requires subscriptionTemplateId for subscription products', () => {
  const parsed = parseCreateCommerceProductInput({
    productKey: 'starter-plan',
    name: 'Starter Plan',
    kind: 'subscription'
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }

  assert.equal(parsed.code, 'subscription_template_required');
});

test('products validator requires price for one_time products', () => {
  const parsed = parseCreateCommerceProductInput({
    productKey: 'starter-pack',
    name: 'Starter Pack',
    kind: 'one_time'
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }

  assert.equal(parsed.code, 'one_time_price_required');
});

test('products validator blocks subscription template for one_time products', () => {
  const parsed = parseCreateCommerceProductInput({
    productKey: 'starter-pack',
    name: 'Starter Pack',
    kind: 'one_time',
    subscriptionTemplateId: 7,
    price: {
      currency: 'USD',
      unitAmountCents: 1999
    }
  });

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }

  assert.equal(parsed.code, 'subscription_template_not_allowed_for_one_time');
});

test('products update validator enforces transition constraints', () => {
  const subscriptionWithPrice = parseUpdateCommerceProductInput({
    kind: 'subscription',
    price: {
      currency: 'USD',
      unitAmountCents: 999
    }
  });
  assert.equal(subscriptionWithPrice.ok, false);
  if (!subscriptionWithPrice.ok) {
    assert.equal(subscriptionWithPrice.code, 'price_not_allowed_for_subscription');
  }

  const oneTimeWithTemplate = parseUpdateCommerceProductInput({
    kind: 'one_time',
    subscriptionTemplateId: 3
  });
  assert.equal(oneTimeWithTemplate.ok, false);
  if (!oneTimeWithTemplate.ok) {
    assert.equal(
      oneTimeWithTemplate.code,
      'subscription_template_not_allowed_for_one_time'
    );
  }
});

test('products update validator rejects empty patches', () => {
  const parsed = parseUpdateCommerceProductInput({});

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }

  assert.equal(parsed.code, 'no_updates_provided');
});

test('products publication payload validator accepts metadata object and rejects invalid metadata', () => {
  const valid = parseCommerceProductPublicationPayload({
    metadata: {
      source: 'admin'
    }
  });
  assert.equal(valid.ok, true);

  const invalid = parseCommerceProductPublicationPayload({
    metadata: 'invalid'
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.code, 'invalid_metadata');
  }
});

test('products validator rejects invalid product ids', () => {
  const parsed = parseProductId('abc');

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }

  assert.equal(parsed.code, 'invalid_product_id');
});
