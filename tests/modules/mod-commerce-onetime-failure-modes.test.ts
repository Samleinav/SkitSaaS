import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import { createProcessOneTimePayPalWebhookEvent } from '../../modules/mod.commerce.one-time-payments/src/webhooks/paypal';
import { createProcessOneTimeStripeWebhookEvent } from '../../modules/mod.commerce.one-time-payments/src/webhooks/stripe';
import type {
  OneTimeFulfillmentMutationResult,
  OneTimeIntent
} from '../../modules/mod.commerce.one-time-payments/src/types';

function createStripeIntentFixture(): OneTimeIntent {
  const now = new Date('2026-02-13T00:00:00.000Z');
  return {
    id: 301,
    intentKey: 'otp_failure_fixture_301',
    productId: 55,
    provider: 'stripe',
    status: 'session_created',
    targetType: 'team',
    targetUserId: null,
    targetTeamId: 44,
    amount: 2500,
    currency: 'USD',
    sessionId: 'cs_test_failure_123',
    providerIntentId: null,
    checkoutUrl: 'https://checkout.stripe.test/cs_test_failure_123',
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

function createPayPalIntentFixture(): OneTimeIntent {
  const now = new Date('2026-02-13T00:00:00.000Z');
  return {
    id: 302,
    intentKey: 'otp_failure_fixture_302',
    productId: 77,
    provider: 'paypal',
    status: 'session_created',
    targetType: 'user',
    targetUserId: 17,
    targetTeamId: null,
    amount: 4999,
    currency: 'USD',
    sessionId: 'ORDER-FAIL-123',
    providerIntentId: 'ORDER-FAIL-123',
    checkoutUrl: 'https://paypal.test/checkoutnow?token=ORDER-FAIL-123',
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
  intent,
  alreadyProcessed = false,
  transitionApplied = true,
  requestedStatus = 'paid',
  status = 'paid'
}: {
  intent: OneTimeIntent;
  alreadyProcessed?: boolean;
  transitionApplied?: boolean;
  requestedStatus?: 'paid' | 'failed' | 'canceled' | 'refunded';
  status?: 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded';
}): OneTimeFulfillmentMutationResult {
  return {
    ok: true,
    alreadyProcessed,
    transitionApplied,
    requestedStatus,
    status,
    intent,
    fulfillment: null
  };
}

function createStripeEvent({
  id,
  type
}: {
  id: string;
  type: string;
}) {
  return {
    id,
    type,
    livemode: false,
    data: {
      object: {
        id: 'cs_test_failure_123',
        currency: 'usd',
        amount_total: 2500,
        payment_intent: 'pi_test_failure_123',
        customer: 'cus_test_failure_123'
      }
    }
  } as unknown as Stripe.Event;
}

function createPayPalEvent({
  id,
  eventType
}: {
  id: string;
  eventType: string;
}) {
  return {
    id,
    event_type: eventType,
    resource: {
      id: eventType.startsWith('PAYMENT.CAPTURE.')
        ? 'CAPTURE-FAIL-123'
        : 'ORDER-FAIL-123',
      amount: {
        value: '49.99',
        currency_code: 'USD'
      },
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-FAIL-123',
          capture_id: 'CAPTURE-FAIL-123'
        }
      }
    }
  } satisfies Record<string, unknown>;
}

test('one-time Stripe webhook handles out-of-order events by keeping paid state terminal for failed downgrade', async () => {
  const intent = createStripeIntentFixture();
  const recordedEventTypes: string[] = [];
  const fulfillmentRequests: string[] = [];

  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => intent,
    registerOneTimeIntentFulfillmentFromWebhook: async ({ status }) => {
      fulfillmentRequests.push(status);
      if (status === 'paid') {
        return createFulfillmentMutationResult({
          intent,
          requestedStatus: 'paid',
          status: 'paid',
          transitionApplied: true
        });
      }

      return createFulfillmentMutationResult({
        intent,
        requestedStatus: 'failed',
        status: 'paid',
        transitionApplied: false
      });
    },
    recordCheckoutEvent: async (payload) => {
      recordedEventTypes.push(String(payload.eventType || ''));
    },
    emitEventAsync: async () => ({
      eventId: 'evt_emitted',
      handlerCount: 0,
      mode: 'inline'
    })
  });

  const paidResult = await processEvent(
    createStripeEvent({
      id: 'evt_out_of_order_paid',
      type: 'checkout.session.completed'
    })
  );
  const failedResult = await processEvent(
    createStripeEvent({
      id: 'evt_out_of_order_failed',
      type: 'checkout.session.async_payment_failed'
    })
  );

  assert.equal(paidResult.handled, true);
  assert.equal(paidResult.status, 'paid');
  assert.equal(failedResult.handled, true);
  assert.equal(failedResult.status, 'paid');
  assert.equal(failedResult.duplicate, false);
  assert.deepEqual(fulfillmentRequests, ['paid', 'failed']);
  assert.deepEqual(recordedEventTypes, ['checkout.session.completed']);
});

test('one-time PayPal webhook handles repeated events idempotently', async () => {
  const intent = createPayPalIntentFixture();
  let callIndex = 0;
  const recordedEventTypes: string[] = [];

  const processEvent = createProcessOneTimePayPalWebhookEvent({
    getOneTimeIntentByProviderIntentId: async () => intent,
    registerOneTimeIntentFulfillmentFromWebhook: async () => {
      callIndex += 1;
      if (callIndex === 1) {
        return createFulfillmentMutationResult({
          intent,
          requestedStatus: 'paid',
          status: 'paid',
          transitionApplied: true
        });
      }

      return createFulfillmentMutationResult({
        intent,
        requestedStatus: 'paid',
        status: 'paid',
        transitionApplied: false,
        alreadyProcessed: true
      });
    },
    recordCheckoutEvent: async (payload) => {
      recordedEventTypes.push(String(payload.eventType || ''));
    },
    emitEventAsync: async () => ({
      eventId: 'evt_emitted',
      handlerCount: 0,
      mode: 'inline'
    })
  });

  const first = await processEvent(
    createPayPalEvent({
      id: 'WH-EVT-REPEAT-1',
      eventType: 'PAYMENT.CAPTURE.COMPLETED'
    })
  );
  const second = await processEvent(
    createPayPalEvent({
      id: 'WH-EVT-REPEAT-1',
      eventType: 'PAYMENT.CAPTURE.COMPLETED'
    })
  );

  assert.equal(first.handled, true);
  assert.equal(first.duplicate, false);
  assert.equal(second.handled, true);
  assert.equal(second.duplicate, true);
  assert.deepEqual(recordedEventTypes, ['PAYMENT.CAPTURE.COMPLETED']);
});

test('one-time Stripe webhook surfaces recorder transient failures for API-level retry handling', async () => {
  const intent = createStripeIntentFixture();
  const processEvent = createProcessOneTimeStripeWebhookEvent({
    getOneTimeIntentBySessionId: async () => intent,
    registerOneTimeIntentFulfillmentFromWebhook: async () =>
      createFulfillmentMutationResult({
        intent,
        requestedStatus: 'paid',
        status: 'paid',
        transitionApplied: true
      }),
    recordCheckoutEvent: async () => {
      throw new Error('transient checkout recorder failure');
    },
    emitEventAsync: async () => ({
      eventId: 'evt_emitted',
      handlerCount: 0,
      mode: 'inline'
    })
  });

  await assert.rejects(
    () =>
      processEvent(
        createStripeEvent({
          id: 'evt_transient_failure_1',
          type: 'checkout.session.completed'
        })
      ),
    /transient checkout recorder failure/
  );
});
