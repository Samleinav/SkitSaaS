import assert from 'node:assert/strict';
import test from 'node:test';
import { EVENT_HOOKS } from '../../lib/events/catalog';
import { recordCheckoutEvent } from '../../lib/payments/checkout-system';
import type { UpsertPaymentOrderResult } from '../../lib/payments/orders';
import type { PaymentSettlementTransactionPersistResult } from '../../lib/payments/transactions';

function buildPersistedOrder(
  patch: Partial<UpsertPaymentOrderResult> = {}
): UpsertPaymentOrderResult {
  return {
    id: 101,
    provider: 'paypal',
    orderType: 'subscription',
    moduleId: null,
    status: 'received',
    eventType: 'PAYMENT.CAPTURE.COMPLETED',
    source: 'webhook',
    teamId: 44,
    targetType: 'team',
    targetTeamId: 44,
    targetUserId: null,
    subscriptionTemplateId: 12,
    paymentMethod: 'paypal',
    planName: 'Starter',
    providerPlanId: 'P-1',
    externalOrderId: 'ORDER-1',
    externalPaymentId: 'CAPTURE-1',
    amount: 2900,
    currency: 'USD',
    message: 'processed',
    metadata: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...patch
  };
}

function buildSettlementPersistResult(
  outcome: PaymentSettlementTransactionPersistResult['outcome']
): PaymentSettlementTransactionPersistResult {
  return {
    outcome,
    transaction: {
      id: 201,
      orderId: 101,
      provider: 'paypal',
      transactionType: 'sale',
      status: 'succeeded',
      amount: 2900,
      currency: 'USD',
      externalTransactionId: 'CAPTURE-1',
      providerEventId: 'WH-1',
      dedupeKey: 'sale:paypal:101:CAPTURE-1:WH-1:received',
      externalInvoiceId: 'ORDER-1',
      payload: null,
      metadata: null,
      occurredAt: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z')
    }
  };
}

test('recordCheckoutEvent short-circuits repeated webhook settlements detected by provider event id', async () => {
  const paymentLogs: Array<Record<string, unknown>> = [];
  const emitCalls: Array<{ hook: string }> = [];
  const asyncEmitCalls: Array<{ hook: string }> = [];
  const lifecycleCalls: Array<Record<string, unknown>> = [];
  let upsertCalls = 0;
  let settlementCalls = 0;

  await recordCheckoutEvent(
    {
      provider: 'paypal',
      orderType: 'subscription',
      status: 'received',
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      source: 'webhook',
      teamId: 44,
      targetType: 'team',
      targetTeamId: 44,
      subscriptionTemplateId: 12,
      paymentMethod: 'paypal',
      planName: 'Starter',
      providerPlanId: 'P-1',
      externalOrderId: 'ORDER-1',
      externalPaymentId: 'CAPTURE-1',
      externalLogId: 'WH-1',
      amount: 2900,
      currency: 'USD',
      message: 'processed'
    },
    {
      emitEvent: async (hook) => {
        emitCalls.push({ hook });
        return {
          eventId: 'evt_before_short',
          handlerCount: 0,
          mode: 'inline' as const
        };
      },
      createPaymentLog: async (input) => {
        paymentLogs.push(input as unknown as Record<string, unknown>);
      },
      upsertPaymentOrder: async () => {
        upsertCalls += 1;
        return buildPersistedOrder();
      },
      getPaymentSettlementTransactionByProviderEventId: async () =>
        buildSettlementPersistResult('unchanged').transaction,
      persistPaymentSettlementTransaction: async () => {
        settlementCalls += 1;
        return buildSettlementPersistResult('unchanged');
      },
      emitEventAsync: async (hook) => {
        asyncEmitCalls.push({ hook });
        return {
          eventId: 'evt_replay_short',
          handlerCount: 0,
          mode: 'inline' as const
        };
      },
      runPaymentOrderSubscriptionLifecycle: async (input) => {
        lifecycleCalls.push(input as unknown as Record<string, unknown>);
        return {
          applied: false,
          targetType: null,
          mode: null,
          reason: 'test_short_circuit'
        };
      }
    }
  );

  assert.equal(paymentLogs.length, 1);
  assert.equal(upsertCalls, 0);
  assert.equal(settlementCalls, 0);
  assert.equal(emitCalls.length, 0);
  assert.equal(asyncEmitCalls.length, 0);
  assert.equal(lifecycleCalls.length, 0);

  const payload = paymentLogs[0].payload as Record<string, unknown>;
  assert.deepEqual(payload.checkoutReplay, {
    detected: true,
    reason: 'provider_event_id',
    providerEventId: 'WH-1'
  });
});

test('recordCheckoutEvent suppresses material effects when settlement persistence reports unchanged replay', async () => {
  const emitCalls: Array<{ hook: string }> = [];
  const asyncEmitCalls: Array<{ hook: string }> = [];
  const lifecycleCalls: Array<Record<string, unknown>> = [];
  let upsertCalls = 0;
  let settlementCalls = 0;

  await recordCheckoutEvent(
    {
      provider: 'paypal',
      orderType: 'subscription',
      status: 'received',
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      source: 'webhook',
      teamId: 44,
      targetType: 'team',
      targetTeamId: 44,
      subscriptionTemplateId: 12,
      paymentMethod: 'paypal',
      planName: 'Starter',
      providerPlanId: 'P-1',
      externalOrderId: 'ORDER-1',
      externalPaymentId: 'CAPTURE-1',
      externalLogId: 'WH-1',
      amount: 2900,
      currency: 'USD',
      message: 'processed'
    },
    {
      emitEvent: async (hook) => {
        emitCalls.push({ hook });
        return {
          eventId: 'evt_before_late',
          handlerCount: 0,
          mode: 'inline' as const
        };
      },
      createPaymentLog: async () => {},
      upsertPaymentOrder: async () => {
        upsertCalls += 1;
        return buildPersistedOrder();
      },
      getPaymentSettlementTransactionByProviderEventId: async () => null,
      persistPaymentSettlementTransaction: async () => {
        settlementCalls += 1;
        return buildSettlementPersistResult('unchanged');
      },
      emitEventAsync: async (hook) => {
        asyncEmitCalls.push({ hook });
        return {
          eventId: 'evt_replay_late',
          handlerCount: 0,
          mode: 'inline' as const
        };
      },
      runPaymentOrderSubscriptionLifecycle: async (input) => {
        lifecycleCalls.push(input as unknown as Record<string, unknown>);
        return {
          applied: false,
          targetType: null,
          mode: null,
          reason: 'test_replay_unchanged'
        };
      }
    }
  );

  assert.equal(upsertCalls, 1);
  assert.equal(settlementCalls, 1);
  assert.deepEqual(
    emitCalls.map((entry) => entry.hook),
    [EVENT_HOOKS.checkoutBeforeCreateOrder]
  );
  assert.equal(asyncEmitCalls.length, 0);
  assert.equal(lifecycleCalls.length, 0);
});
