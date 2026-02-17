import assert from 'node:assert/strict';
import test from 'node:test';
import { recordCheckoutEvent } from '../../lib/payments/checkout-system';
import type { UpsertPaymentOrderResult } from '../../lib/payments/orders';

function createPersistedOrder({
  id,
  orderType,
  moduleId,
  status
}: {
  id: number;
  orderType: 'subscription' | 'one_time';
  moduleId: string | null;
  status: 'pending' | 'received' | 'failed' | 'canceled';
}): UpsertPaymentOrderResult {
  const now = new Date('2026-02-13T00:00:00.000Z');
  return {
    id,
    provider: 'stripe',
    orderType,
    status,
    eventType: 'checkout.session.completed',
    source: 'webhook',
    moduleId,
    teamId: null,
    targetType: 'user',
    targetTeamId: null,
    targetUserId: 77,
    subscriptionTemplateId: null,
    paymentMethod: 'card',
    planName: 'One-Time Pack',
    providerPlanId: 'price_ot_1',
    externalOrderId: 'cs_test_1',
    externalPaymentId: 'pi_test_1',
    amount: 2500,
    currency: 'USD',
    message: 'test',
    metadata: null,
    createdAt: now,
    updatedAt: now
  };
}

test('recordCheckoutEvent one_time payload persists order shape and settlement without subscription lifecycle', async () => {
  const emitCalls: string[] = [];
  const emitAsyncCalls: string[] = [];
  const upsertCalls: Array<Record<string, unknown>> = [];
  const settlementCalls: Array<Record<string, unknown>> = [];
  let lifecycleCalls = 0;

  await recordCheckoutEvent(
    {
      provider: 'stripe',
      orderType: 'one_time',
      moduleId: 'mod.commerce.one-time-payments',
      status: 'received',
      eventType: 'checkout.session.completed',
      source: 'webhook',
      targetType: 'user',
      targetUserId: 77,
      paymentMethod: 'card',
      planName: 'One-Time Pack',
      providerPlanId: 'price_ot_1',
      externalOrderId: 'cs_test_1',
      externalPaymentId: 'pi_test_1',
      amount: 2500,
      currency: 'USD',
      message: 'processed'
    },
    {
      emitEvent: async (hook) => {
        emitCalls.push(hook);
        return {
          eventId: 'evt_before',
          handlerCount: 0,
          mode: 'inline'
        };
      },
      createPaymentLog: async () => {},
      upsertPaymentOrder: async (payload) => {
        upsertCalls.push(payload as unknown as Record<string, unknown>);
        return createPersistedOrder({
          id: 901,
          orderType: 'one_time',
          moduleId: 'mod.commerce.one-time-payments',
          status: 'received'
        });
      },
      persistPaymentSettlementTransaction: async (payload) => {
        settlementCalls.push(payload as unknown as Record<string, unknown>);
        return null;
      },
      emitEventAsync: async (hook) => {
        emitAsyncCalls.push(hook);
        return {
          eventId: 'evt_async',
          handlerCount: 0,
          mode: 'inline'
        };
      },
      runPaymentOrderSubscriptionLifecycle: async () => {
        lifecycleCalls += 1;
        return {
          applied: false,
          targetType: null,
          mode: null,
          reason: 'order_type_not_subscription'
        };
      }
    }
  );

  assert.equal(emitCalls.length, 1);
  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0]?.orderType, 'one_time');
  assert.equal(upsertCalls[0]?.moduleId, 'mod.commerce.one-time-payments');

  assert.equal(settlementCalls.length, 1);
  assert.equal(settlementCalls[0]?.orderStatus, 'received');
  assert.equal(settlementCalls[0]?.orderId, 901);

  assert.equal(lifecycleCalls, 0);
  assert.deepEqual(emitAsyncCalls, [
    'checkout.after_create_order',
    'payments.order.status_changed'
  ]);
});

test('recordCheckoutEvent one_time pending status does not persist settlement transaction', async () => {
  const settlementCalls: Array<Record<string, unknown>> = [];
  let lifecycleCalls = 0;

  await recordCheckoutEvent(
    {
      provider: 'stripe',
      orderType: 'one_time',
      moduleId: 'mod.commerce.one-time-payments',
      status: 'pending',
      eventType: 'checkout.session.created',
      source: 'checkout',
      targetType: 'user',
      targetUserId: 77,
      externalOrderId: 'cs_test_pending',
      externalPaymentId: 'pi_test_pending'
    },
    {
      emitEvent: async () => ({
        eventId: 'evt_before',
        handlerCount: 0,
        mode: 'inline'
      }),
      createPaymentLog: async () => {},
      upsertPaymentOrder: async () =>
        createPersistedOrder({
          id: 902,
          orderType: 'one_time',
          moduleId: 'mod.commerce.one-time-payments',
          status: 'pending'
        }),
      persistPaymentSettlementTransaction: async (payload) => {
        settlementCalls.push(payload as unknown as Record<string, unknown>);
        return null;
      },
      emitEventAsync: async () => ({
        eventId: 'evt_async',
        handlerCount: 0,
        mode: 'inline'
      }),
      runPaymentOrderSubscriptionLifecycle: async () => {
        lifecycleCalls += 1;
        return {
          applied: false,
          targetType: null,
          mode: null,
          reason: 'order_type_not_subscription'
        };
      }
    }
  );

  assert.equal(settlementCalls.length, 0);
  assert.equal(lifecycleCalls, 0);
});
