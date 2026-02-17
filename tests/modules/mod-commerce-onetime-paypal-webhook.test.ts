import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProcessOneTimePayPalWebhookEvent
} from '../../modules/mod.commerce.one-time-payments/src/webhooks/paypal';
import type {
  OneTimeFulfillmentMutationResult,
  OneTimeIntent
} from '../../modules/mod.commerce.one-time-payments/src/types';

function createIntentFixture(): OneTimeIntent {
  const now = new Date('2026-02-13T00:00:00.000Z');
  return {
    id: 202,
    intentKey: 'otp_fixture_paypal_202',
    productId: 77,
    provider: 'paypal',
    status: 'session_created',
    targetType: 'user',
    targetUserId: 17,
    targetTeamId: null,
    amount: 4999,
    currency: 'USD',
    sessionId: 'ORDER-123',
    providerIntentId: 'ORDER-123',
    checkoutUrl: 'https://paypal.test/checkoutnow?token=ORDER-123',
    idempotencyKey: null,
    productSnapshot: {
      name: 'One-Time Pack',
      price: {
        providerPriceId: 'price_paypal_1'
      }
    },
    metadata: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function createFulfillmentMutationResult({
  alreadyProcessed = false,
  transitionApplied = true,
  requestedStatus = 'paid',
  status = 'paid'
}: {
  alreadyProcessed?: boolean;
  transitionApplied?: boolean;
  requestedStatus?: 'paid' | 'failed' | 'canceled' | 'refunded';
  status?: 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded';
} = {}): OneTimeFulfillmentMutationResult {
  return {
    ok: true,
    alreadyProcessed,
    transitionApplied,
    requestedStatus,
    status,
    intent: createIntentFixture(),
    fulfillment: null
  };
}

function createPayPalEvent({
  id = 'WH-EVT-1',
  eventType = 'PAYMENT.CAPTURE.COMPLETED'
}: {
  id?: string;
  eventType?: string;
}) {
  return {
    id,
    event_type: eventType,
    resource: {
      id: eventType.startsWith('PAYMENT.CAPTURE.') ? 'CAPTURE-123' : 'ORDER-123',
      amount: {
        value: '49.99',
        currency_code: 'USD'
      },
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-123',
          capture_id: 'CAPTURE-123'
        }
      }
    }
  } satisfies Record<string, unknown>;
}

test('one-time PayPal webhook processor ignores unsupported event types', async () => {
  let intentCalls = 0;
  let fulfillmentCalls = 0;
  let recordCalls = 0;

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => {
      intentCalls += 1;
      return null;
    },
    registerOneTimeIntentFulfillmentFromWebhook: async () => {
      fulfillmentCalls += 1;
      return createFulfillmentMutationResult();
    },
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(
    createPayPalEvent({ eventType: 'CHECKOUT.ORDER.APPROVED' })
  );

  assert.equal(result.handled, false);
  assert.equal(intentCalls, 0);
  assert.equal(fulfillmentCalls, 0);
  assert.equal(recordCalls, 0);
});

test('one-time PayPal webhook processor returns not handled when intent is missing', async () => {
  let fulfillmentCalls = 0;
  let recordCalls = 0;

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => null,
    registerOneTimeIntentFulfillmentFromWebhook: async () => {
      fulfillmentCalls += 1;
      return createFulfillmentMutationResult();
    },
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(createPayPalEvent({}));

  assert.equal(result.handled, false);
  assert.equal(fulfillmentCalls, 0);
  assert.equal(recordCalls, 0);
});

test('one-time PayPal webhook processor stops on duplicate provider event id', async () => {
  let recordCalls = 0;

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => createIntentFixture(),
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult({
        alreadyProcessed: true,
        transitionApplied: false
      }),
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(createPayPalEvent({ id: 'WH-EVT-DUP' }));

  assert.equal(result.handled, true);
  assert.equal(result.duplicate, true);
  assert.equal(recordCalls, 0);
});

test('one-time PayPal webhook processor records core one_time order on successful completion', async () => {
  const recordedPayloads: Array<Record<string, unknown>> = [];
  const emittedHooks: string[] = [];

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => createIntentFixture(),
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult(),
    recordCheckoutEvent: async (payload) => {
      recordedPayloads.push(payload as unknown as Record<string, unknown>);
    },
    emitEventAsync: async (hook) => {
      emittedHooks.push(hook);
      return {
        eventId: 'evt_emitted',
        handlerCount: 0,
        mode: 'inline'
      };
    }
  });

  const result = await processEvent(createPayPalEvent({ id: 'WH-EVT-OK' }));

  assert.equal(result.handled, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.status, 'paid');
  assert.equal(recordedPayloads.length, 1);
  assert.equal(emittedHooks.length, 1);
  assert.equal(
    emittedHooks[0],
    'mod.commerce.one-time-payments.fulfillment.updated'
  );

  const payload = recordedPayloads[0] || {};
  assert.equal(payload.provider, 'paypal');
  assert.equal(payload.orderType, 'one_time');
  assert.equal(payload.moduleId, 'mod.commerce.one-time-payments');
  assert.equal(payload.status, 'received');
  assert.equal(payload.eventType, 'PAYMENT.CAPTURE.COMPLETED');
  assert.equal(payload.targetType, 'user');
  assert.equal(payload.targetUserId, 17);
  assert.equal(payload.externalOrderId, 'ORDER-123');
  assert.equal(payload.externalPaymentId, 'CAPTURE-123');
});

test('one-time PayPal webhook processor skips order write when transition guard blocks update', async () => {
  let recordCalls = 0;

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => createIntentFixture(),
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult({
        transitionApplied: false,
        requestedStatus: 'failed',
        status: 'paid'
      }),
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(
    createPayPalEvent({
      id: 'WH-EVT-GUARD',
      eventType: 'PAYMENT.CAPTURE.DENIED'
    })
  );

  assert.equal(result.handled, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.status, 'paid');
  assert.equal(recordCalls, 0);
});
