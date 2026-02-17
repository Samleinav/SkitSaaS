import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import {
  createProcessOneTimeStripeWebhookEvent
} from '../../modules/mod.commerce.one-time-payments/src/webhooks/stripe';
import type {
  OneTimeFulfillmentMutationResult,
  OneTimeIntent
} from '../../modules/mod.commerce.one-time-payments/src/types';

function createIntentFixture(): OneTimeIntent {
  const now = new Date('2026-02-13T00:00:00.000Z');
  return {
    id: 101,
    intentKey: 'otp_fixture_101',
    productId: 55,
    provider: 'stripe',
    status: 'session_created',
    targetType: 'team',
    targetUserId: null,
    targetTeamId: 44,
    amount: 2500,
    currency: 'USD',
    sessionId: 'cs_test_123',
    providerIntentId: null,
    checkoutUrl: 'https://checkout.stripe.test/cs_test_123',
    idempotencyKey: null,
    productSnapshot: {
      name: 'Starter Pack',
      price: {
        providerPriceId: 'price_abc'
      }
    },
    metadata: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function createStripeEvent({
  id = 'evt_test_1',
  type = 'checkout.session.completed'
}: {
  id?: string;
  type?: string;
}) {
  return {
    id,
    type,
    livemode: false,
    data: {
      object: {
        id: 'cs_test_123',
        currency: 'usd',
        amount_total: 2500,
        payment_intent: 'pi_test_123',
        customer: 'cus_test_123'
      }
    }
  } as unknown as Stripe.Event;
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

test('one-time Stripe webhook processor ignores unsupported event types', async () => {
  let intentCalls = 0;
  let fulfillmentCalls = 0;
  let recordCalls = 0;

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => {
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
    createStripeEvent({ type: 'payment_intent.succeeded' })
  );

  assert.equal(result.handled, false);
  assert.equal(intentCalls, 0);
  assert.equal(fulfillmentCalls, 0);
  assert.equal(recordCalls, 0);
});

test('one-time Stripe webhook processor returns not handled when session has no intent', async () => {
  let fulfillmentCalls = 0;
  let recordCalls = 0;

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => null,
    registerOneTimeIntentFulfillmentFromWebhook: async () => {
      fulfillmentCalls += 1;
      return createFulfillmentMutationResult();
    },
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(createStripeEvent({}));

  assert.equal(result.handled, false);
  assert.equal(fulfillmentCalls, 0);
  assert.equal(recordCalls, 0);
});

test('one-time Stripe webhook processor stops on duplicate provider event id', async () => {
  let recordCalls = 0;

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => createIntentFixture(),
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult({
        alreadyProcessed: true,
        transitionApplied: false
      }),
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(createStripeEvent({ id: 'evt_dup_1' }));

  assert.equal(result.handled, true);
  assert.equal(result.duplicate, true);
  assert.equal(recordCalls, 0);
});

test('one-time Stripe webhook processor records core one_time order on successful completion', async () => {
  const recordedPayloads: Array<Record<string, unknown>> = [];
  const emittedHooks: string[] = [];

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => createIntentFixture(),
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

  const result = await processEvent(createStripeEvent({ id: 'evt_ok_1' }));

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
  assert.equal(payload.orderType, 'one_time');
  assert.equal(payload.moduleId, 'mod.commerce.one-time-payments');
  assert.equal(payload.status, 'received');
  assert.equal(payload.eventType, 'checkout.session.completed');
  assert.equal(payload.targetType, 'team');
  assert.equal(payload.targetTeamId, 44);
  assert.equal(payload.providerPlanId, 'price_abc');
});

test('one-time Stripe webhook processor skips order write when transition guard blocks update', async () => {
  let recordCalls = 0;

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => createIntentFixture(),
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult({
        transitionApplied: false,
        requestedStatus: 'canceled',
        status: 'paid'
      }),
    recordCheckoutEvent: async () => {
      recordCalls += 1;
    }
  });

  const result = await processEvent(
    createStripeEvent({
      id: 'evt_guard_1',
      type: 'checkout.session.expired'
    })
  );

  assert.equal(result.handled, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.status, 'paid');
  assert.equal(recordCalls, 0);
});
