import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOneTimeFulfillmentStatusTransition } from '../../modules/mod.commerce.one-time-payments/src/fulfillment-state';

test('one-time fulfillment state transitions apply payment confirmation from pending', () => {
  const result = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: 'pending',
    requestedStatus: 'paid'
  });

  assert.equal(result.nextStatus, 'paid');
  assert.equal(result.transitionApplied, true);
});

test('one-time fulfillment state transitions block failed downgrade after paid', () => {
  const result = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: 'paid',
    requestedStatus: 'failed'
  });

  assert.equal(result.nextStatus, 'paid');
  assert.equal(result.transitionApplied, false);
});

test('one-time fulfillment state transitions allow paid to refunded', () => {
  const result = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: 'paid',
    requestedStatus: 'refunded'
  });

  assert.equal(result.nextStatus, 'refunded');
  assert.equal(result.transitionApplied, true);
});

test('one-time fulfillment state transitions block refund before payment', () => {
  const result = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: 'failed',
    requestedStatus: 'refunded'
  });

  assert.equal(result.nextStatus, 'failed');
  assert.equal(result.transitionApplied, false);
});

test('one-time fulfillment state transitions keep refunded as terminal state', () => {
  const result = resolveOneTimeFulfillmentStatusTransition({
    currentStatus: 'refunded',
    requestedStatus: 'paid'
  });

  assert.equal(result.nextStatus, 'refunded');
  assert.equal(result.transitionApplied, false);
});
