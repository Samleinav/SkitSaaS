import type Stripe from 'stripe';
import { emitEventAsync } from '@skitsaas/sdk/server';
import { recordCheckoutEvent } from '@/lib/payments/checkout-system';
import {
  getCheckoutOrderByProviderSession,
  markCheckoutOrderCanceled,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed
} from '@/lib/payments/checkout-orders';
import {
  COMMERCE_ONE_TIME_PAYMENTS_EVENTS,
  COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID
} from '../constants';
import {
  getOneTimeIntentBySessionId,
  registerOneTimeIntentFulfillmentFromWebhook
} from '../data';
import type {
  OneTimeFulfillmentStatus,
  OneTimeIntent
} from '../types';

type StripeWebhookProcessResult = {
  handled: boolean;
  duplicate: boolean;
  status: OneTimeFulfillmentStatus | null;
  intentId: number | null;
  message: string;
};

function parseOneTimeIntentSnapshot(intent: OneTimeIntent) {
  const source = intent.productSnapshot;
  const productName =
    typeof source.name === 'string' && source.name.trim()
      ? source.name.trim()
      : `Product ${intent.productId}`;
  const providerPriceId =
    source.price &&
    typeof source.price === 'object' &&
    !Array.isArray(source.price) &&
    typeof (source.price as Record<string, unknown>).providerPriceId === 'string'
      ? ((source.price as Record<string, unknown>).providerPriceId as string)
      : null;

  return {
    productName,
    providerPriceId
  };
}

function getSessionCurrency(session: Stripe.Checkout.Session, fallback: string) {
  if (typeof session.currency === 'string' && session.currency.trim()) {
    return session.currency.trim().toUpperCase();
  }

  return fallback.toUpperCase();
}

function getSessionAmount(session: Stripe.Checkout.Session, fallback: number) {
  if (typeof session.amount_total === 'number' && Number.isInteger(session.amount_total)) {
    return session.amount_total;
  }

  return fallback;
}

function mapWebhookSessionStatus(eventType: string) {
  if (eventType === 'checkout.session.completed') {
    return 'paid' as const;
  }

  if (eventType === 'checkout.session.async_payment_failed') {
    return 'failed' as const;
  }

  if (eventType === 'checkout.session.expired') {
    return 'canceled' as const;
  }

  return null;
}

function mapWebhookOrderStatus(
  status: 'paid' | 'failed' | 'canceled' | 'refunded'
) {
  if (status === 'paid') {
    return 'received' as const;
  }

  if (status === 'failed') {
    return 'failed' as const;
  }

  if (status === 'refunded') {
    return 'canceled' as const;
  }

  return 'canceled' as const;
}

function isFinalWebhookStatus(
  status: OneTimeFulfillmentStatus
): status is Exclude<OneTimeFulfillmentStatus, 'pending'> {
  return status !== 'pending';
}

type CheckoutOrderByProviderSession = Awaited<
  ReturnType<typeof getCheckoutOrderByProviderSession>
>;

async function syncCheckoutOrderStatusForStripeWebhook({
  deps,
  checkoutOrder,
  resolvedStatus,
  externalPaymentId
}: {
  deps: StripeWebhookDeps;
  checkoutOrder: CheckoutOrderByProviderSession;
  resolvedStatus: Exclude<OneTimeFulfillmentStatus, 'pending'>;
  externalPaymentId: string;
}) {
  if (!checkoutOrder) {
    return;
  }

  if (resolvedStatus === 'paid') {
    await deps.markCheckoutOrderCompleted({
      checkoutOrderId: checkoutOrder.id,
      provider: 'module',
      providerReferenceId: externalPaymentId
    });
    return;
  }

  if (resolvedStatus === 'failed') {
    await deps.markCheckoutOrderFailed({
      checkoutOrderId: checkoutOrder.id,
      provider: 'module',
      providerReferenceId: externalPaymentId
    });
    return;
  }

  await deps.markCheckoutOrderCanceled({
    checkoutOrderId: checkoutOrder.id,
    provider: 'module'
  });
}

type StripeWebhookDeps = {
  getOneTimeIntentBySessionId: typeof getOneTimeIntentBySessionId;
  registerOneTimeIntentFulfillmentFromWebhook:
    typeof registerOneTimeIntentFulfillmentFromWebhook;
  getCheckoutOrderByProviderSession: typeof getCheckoutOrderByProviderSession;
  markCheckoutOrderCompleted: typeof markCheckoutOrderCompleted;
  markCheckoutOrderFailed: typeof markCheckoutOrderFailed;
  markCheckoutOrderCanceled: typeof markCheckoutOrderCanceled;
  recordCheckoutEvent: typeof recordCheckoutEvent;
  emitEventAsync: typeof emitEventAsync;
};

const DEFAULT_WEBHOOK_DEPS: StripeWebhookDeps = {
  getOneTimeIntentBySessionId,
  registerOneTimeIntentFulfillmentFromWebhook,
  getCheckoutOrderByProviderSession: async () => null,
  markCheckoutOrderCompleted: async () => null,
  markCheckoutOrderFailed: async () => null,
  markCheckoutOrderCanceled: async () => null,
  recordCheckoutEvent,
  emitEventAsync
};

export function createProcessOneTimeStripeWebhookEvent(
  deps: Partial<StripeWebhookDeps> = {}
) {
  const resolvedDeps = {
    ...DEFAULT_WEBHOOK_DEPS,
    ...deps
  } satisfies StripeWebhookDeps;

  return async function processOneTimeStripeWebhookEvent(
    event: Stripe.Event
  ): Promise<StripeWebhookProcessResult> {
  const mappedStatus = mapWebhookSessionStatus(event.type);
  if (!mappedStatus) {
    return {
      handled: false,
      duplicate: false,
      status: null,
      intentId: null,
      message: `Ignored Stripe event type "${event.type}".`
    };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = typeof session.id === 'string' ? session.id : null;
  if (!sessionId) {
    return {
      handled: false,
      duplicate: false,
      status: null,
      intentId: null,
      message: 'Stripe session id is missing.'
    };
  }

  const intent = await resolvedDeps.getOneTimeIntentBySessionId(sessionId);
  if (!intent) {
    return {
      handled: false,
      duplicate: false,
      status: null,
      intentId: null,
      message: `One-time intent not found for Stripe session "${sessionId}".`
    };
  }

  const externalPaymentId =
    typeof session.payment_intent === 'string' && session.payment_intent.trim()
      ? session.payment_intent
      : sessionId;
  const amount = getSessionAmount(session, intent.amount);
  const currency = getSessionCurrency(session, intent.currency);
  const checkoutOrder = await resolvedDeps.getCheckoutOrderByProviderSession({
    provider: 'module',
    providerSessionId: sessionId
  });

  const fulfillment = await resolvedDeps.registerOneTimeIntentFulfillmentFromWebhook({
    intentId: intent.id,
    orderId: checkoutOrder?.id ?? null,
    status: mappedStatus,
    providerEventId: event.id,
    externalPaymentId,
    amount,
    currency,
    payload: event as unknown as Record<string, unknown>,
    metadata: {
      eventType: event.type,
      livemode: event.livemode
    }
  });

  if (!fulfillment.ok) {
    return {
      handled: false,
      duplicate: false,
      status: null,
      intentId: intent.id,
      message: fulfillment.message
    };
  }

  if (fulfillment.alreadyProcessed) {
    return {
      handled: true,
      duplicate: true,
      status: fulfillment.status,
      intentId: intent.id,
      message: `Stripe event "${event.id}" was already processed.`
    };
  }

  if (!fulfillment.transitionApplied) {
    return {
      handled: true,
      duplicate: false,
      status: fulfillment.status,
      intentId: intent.id,
      message: `Stripe one-time event "${event.type}" ignored due to fulfillment state transition guard.`
    };
  }

  const snapshot = parseOneTimeIntentSnapshot(intent);
  const teamId = intent.targetType === 'team' ? intent.targetTeamId : null;
  const resolvedStatus = fulfillment.status;

  if (!isFinalWebhookStatus(resolvedStatus)) {
    return {
      handled: true,
      duplicate: false,
      status: resolvedStatus,
      intentId: intent.id,
      message: `Stripe one-time event "${event.type}" did not resolve to a final fulfillment status.`
    };
  }

  await syncCheckoutOrderStatusForStripeWebhook({
    deps: resolvedDeps,
    checkoutOrder,
    resolvedStatus,
    externalPaymentId
  });

  try {
    await resolvedDeps.emitEventAsync(
      COMMERCE_ONE_TIME_PAYMENTS_EVENTS.fulfillmentUpdated,
      {
        moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
        provider: 'stripe',
        intentId: intent.id,
        intentKey: intent.intentKey,
        status: resolvedStatus,
        requestedStatus: fulfillment.requestedStatus,
        eventType: event.type,
        webhookEventId: event.id
      },
      {
        moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
        source: '/modules/mod.commerce.one-time-payments/webhooks/stripe',
        teamId: intent.targetType === 'team' ? intent.targetTeamId : null,
        targetUserId:
          intent.targetType === 'user' ? intent.targetUserId : null
      }
    );
  } catch (error) {
    console.warn(
      '[mod.commerce.one-time-payments] Unable to emit fulfillmentUpdated event',
      error
    );
  }

  await resolvedDeps.recordCheckoutEvent({
    provider: 'stripe',
    orderType: 'one_time',
    moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
    status: mapWebhookOrderStatus(resolvedStatus),
    eventType: event.type,
    source: 'webhook',
    teamId,
    targetType: intent.targetType,
    targetTeamId: intent.targetTeamId,
    targetUserId: intent.targetUserId,
    subscriptionTemplateId: null,
    paymentMethod: 'card',
    planName: snapshot.productName,
    providerPlanId: snapshot.providerPriceId,
    externalOrderId: sessionId,
    externalPaymentId,
    amount,
    currency,
    message: `Stripe one-time event processed: ${event.type}.`,
    metadata: {
      oneTimeIntentId: intent.id,
      oneTimeIntentKey: intent.intentKey,
      fulfillmentStatus: resolvedStatus
    },
    providerMetadata: {
      sessionId,
      paymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      customerId:
        typeof session.customer === 'string' ? session.customer : null,
      webhookEventId: event.id
    }
  });

  return {
    handled: true,
    duplicate: false,
    status: resolvedStatus,
    intentId: intent.id,
    message: `Stripe one-time event "${event.type}" processed.`
  };
  };
}

export const processOneTimeStripeWebhookEvent =
  createProcessOneTimeStripeWebhookEvent({
    getCheckoutOrderByProviderSession,
    markCheckoutOrderCompleted,
    markCheckoutOrderFailed,
    markCheckoutOrderCanceled
  });
