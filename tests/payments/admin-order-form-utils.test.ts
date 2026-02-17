import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_MANUAL_ORDER_EVENT_TYPE,
  ADMIN_MANUAL_ORDER_SOURCE,
  collectChangedFields,
  mapOrderStatusToLogStatus,
  parseAdminPaymentOrderInput
} from '../../app/(dashboard)/admin/orders/form-utils';

function createFormReader(fields: Record<string, string>) {
  const read = (field: string) => (fields[field] || '').trim();

  return {
    string(field: string) {
      return read(field);
    },
    lower(field: string) {
      return read(field).toLowerCase();
    }
  };
}

test('parseAdminPaymentOrderInput parses a valid manual order payload', () => {
  const parsed = parseAdminPaymentOrderInput(
    createFormReader({
      provider: 'Stripe',
      status: 'received',
      teamId: '12',
      subscriptionTemplateId: '33',
      paymentMethod: 'card',
      planName: 'Pro',
      providerPlanId: 'price_123',
      externalOrderId: 'ord_123',
      externalPaymentId: 'sub_123',
      amountMajor: '10,50',
      currency: 'usd',
      message: 'Manual payment order'
    }),
    {
      defaultSource: ADMIN_MANUAL_ORDER_SOURCE,
      defaultEventType: ADMIN_MANUAL_ORDER_EVENT_TYPE
    }
  );

  assert.equal(parsed.valid, true);
  assert.ok(parsed.value);
  assert.equal(parsed.value.provider, 'stripe');
  assert.equal(parsed.value.status, 'received');
  assert.equal(parsed.value.source, 'dashboard');
  assert.equal(parsed.value.eventType, ADMIN_MANUAL_ORDER_EVENT_TYPE);
  assert.equal(parsed.value.amount, 1050);
  assert.equal(parsed.value.currency, 'USD');
  assert.equal(parsed.value.teamId, 12);
  assert.equal(parsed.value.subscriptionTemplateId, 33);
});

test('parseAdminPaymentOrderInput rejects invalid order source', () => {
  const parsed = parseAdminPaymentOrderInput(
    createFormReader({
      provider: 'stripe',
      status: 'pending',
      source: 'admin-panel',
      eventType: 'checkout.completed'
    })
  );

  assert.equal(parsed.valid, false);
  assert.equal(parsed.value, null);
});

test('collectChangedFields returns only changed keys', () => {
  const before = {
    provider: 'stripe',
    status: 'pending',
    source: 'dashboard',
    eventType: 'checkout.completed',
    teamId: 1,
    subscriptionTemplateId: 2,
    paymentMethod: 'card',
    planName: 'Pro',
    providerPlanId: 'price_1',
    externalOrderId: 'order_1',
    externalPaymentId: 'payment_1',
    amount: 1000,
    currency: 'USD',
    message: 'before'
  };

  const after = {
    ...before,
    status: 'received',
    amount: 1050,
    message: 'after'
  };

  const changed = collectChangedFields(before, after);

  assert.deepEqual(Object.keys(changed).sort(), ['amount', 'message', 'status']);
  assert.deepEqual(changed.status, {
    from: 'pending',
    to: 'received'
  });
});

test('mapOrderStatusToLogStatus maps status to payment log status', () => {
  assert.equal(mapOrderStatusToLogStatus('received'), 'success');
  assert.equal(mapOrderStatusToLogStatus('failed'), 'failed');
  assert.equal(mapOrderStatusToLogStatus('pending'), 'info');
  assert.equal(mapOrderStatusToLogStatus('canceled'), 'info');
});
