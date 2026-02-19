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
  getOneTimeIntentByProviderIntentId,
  registerOneTimeIntentFulfillmentFromWebhook
} from '../data';
import type {
  OneTimeFulfillmentStatus,
  OneTimeIntent
} from '../types';

type PayPalWebhookEvent = {
  id?: unknown;
  event_type?: unknown;
  resource?: {
    id?: unknown;
    amount?: {
      value?: unknown;
      currency_code?: unknown;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: unknown;
        capture_id?: unknown;
      };
    };
  };
};

type PayPalWebhookProcessResult = {
  handled: boolean;
  duplicate: boolean;
  status: OneTimeFulfillmentStatus | null;
  intentId: number | null;
  message: string;
};

type PayPalWebhookDeps = {
  getOneTimeIntentByProviderIntentId: typeof getOneTimeIntentByProviderIntentId;
  registerOneTimeIntentFulfillmentFromWebhook:
    typeof registerOneTimeIntentFulfillmentFromWebhook;
  getCheckoutOrderByProviderSession: typeof getCheckoutOrderByProviderSession;
  markCheckoutOrderCompleted: typeof markCheckoutOrderCompleted;
  markCheckoutOrderFailed: typeof markCheckoutOrderFailed;
  markCheckoutOrderCanceled: typeof markCheckoutOrderCanceled;
  recordCheckoutEvent: typeof recordCheckoutEvent;
  emitEventAsync: typeof emitEventAsync;
};

const DEFAULT_WEBHOOK_DEPS: PayPalWebhookDeps = {
  getOneTimeIntentByProviderIntentId,
  registerOneTimeIntentFulfillmentFromWebhook,
  getCheckoutOrderByProviderSession: async () => null,
  markCheckoutOrderCompleted: async () => null,
  markCheckoutOrderFailed: async () => null,
  markCheckoutOrderCanceled: async () => null,
  recordCheckoutEvent,
  emitEventAsync
};

function trimToNull(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

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

function mapWebhookStatus(eventType: string) {
  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    return 'paid' as const;
  }

  if (
    eventType === 'PAYMENT.CAPTURE.DENIED' ||
    eventType === 'PAYMENT.CAPTURE.DECLINED'
  ) {
    return 'failed' as const;
  }

  if (
    eventType === 'CHECKOUT.ORDER.EXPIRED' ||
    eventType === 'PAYMENT.CAPTURE.REVERSED'
  ) {
    return 'canceled' as const;
  }

  if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    return 'refunded' as const;
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

async function syncCheckoutOrderStatusForPayPalWebhook({
  deps,
  checkoutOrder,
  resolvedStatus,
  externalPaymentId
}: {
  deps: PayPalWebhookDeps;
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

function resolveOrderId(event: PayPalWebhookEvent, eventType: string) {
  if (eventType.startsWith('CHECKOUT.ORDER.')) {
    return trimToNull(event.resource?.id);
  }

  return trimToNull(event.resource?.supplementary_data?.related_ids?.order_id);
}

function resolveCaptureId(event: PayPalWebhookEvent, eventType: string) {
  if (eventType.startsWith('PAYMENT.CAPTURE.')) {
    return trimToNull(event.resource?.id);
  }

  return trimToNull(event.resource?.supplementary_data?.related_ids?.capture_id);
}

function resolveCurrency(event: PayPalWebhookEvent, fallbackCurrency: string) {
  const value = trimToNull(event.resource?.amount?.currency_code);
  if (value) {
    return value.toUpperCase();
  }

  return fallbackCurrency.toUpperCase();
}

function resolveAmount(event: PayPalWebhookEvent, fallbackAmount: number) {
  const rawValue = trimToNull(event.resource?.amount?.value);
  if (!rawValue) {
    return fallbackAmount;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallbackAmount;
  }

  return Math.round(parsedValue * 100);
}

export function createProcessOneTimePayPalWebhookEvent(
  deps: Partial<PayPalWebhookDeps> = {}
) {
  const resolvedDeps = {
    ...DEFAULT_WEBHOOK_DEPS,
    ...deps
  } satisfies PayPalWebhookDeps;

  return async function processOneTimePayPalWebhookEvent(
    rawEvent: Record<string, unknown>
  ): Promise<PayPalWebhookProcessResult> {
    const event = rawEvent as PayPalWebhookEvent;
    const eventType = trimToNull(event.event_type);
    if (!eventType) {
      return {
        handled: false,
        duplicate: false,
        status: null,
        intentId: null,
        message: 'PayPal webhook event type is missing.'
      };
    }

    const mappedStatus = mapWebhookStatus(eventType);
    if (!mappedStatus) {
      return {
        handled: false,
        duplicate: false,
        status: null,
        intentId: null,
        message: `Ignored PayPal event type "${eventType}".`
      };
    }

    const eventId = trimToNull(event.id);
    if (!eventId) {
      return {
        handled: false,
        duplicate: false,
        status: null,
        intentId: null,
        message: 'PayPal webhook event id is missing.'
      };
    }

    const orderId = resolveOrderId(event, eventType);
    if (!orderId) {
      return {
        handled: false,
        duplicate: false,
        status: null,
        intentId: null,
        message: 'PayPal order reference is missing from webhook payload.'
      };
    }

    const intent = await resolvedDeps.getOneTimeIntentByProviderIntentId({
      provider: 'paypal',
      providerIntentId: orderId
    });
    if (!intent) {
      return {
        handled: false,
        duplicate: false,
        status: null,
        intentId: null,
        message: `One-time intent not found for PayPal order "${orderId}".`
      };
    }

    const captureId = resolveCaptureId(event, eventType);
    const externalPaymentId = captureId || orderId;
    const amount = resolveAmount(event, intent.amount);
    const currency = resolveCurrency(event, intent.currency);
    const checkoutOrder = await resolvedDeps.getCheckoutOrderByProviderSession({
      provider: 'module',
      providerSessionId: orderId
    });

    const fulfillment =
      await resolvedDeps.registerOneTimeIntentFulfillmentFromWebhook({
        intentId: intent.id,
        orderId: checkoutOrder?.id ?? null,
        status: mappedStatus,
        providerEventId: eventId,
        externalPaymentId,
        amount,
        currency,
        payload: rawEvent,
        metadata: {
          eventType
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
        message: `PayPal event "${eventId}" was already processed.`
      };
    }

    if (!fulfillment.transitionApplied) {
      return {
        handled: true,
        duplicate: false,
        status: fulfillment.status,
        intentId: intent.id,
        message: `PayPal one-time event "${eventType}" ignored due to fulfillment state transition guard.`
      };
    }

    const resolvedStatus = fulfillment.status;
    const snapshot = parseOneTimeIntentSnapshot(intent);

    if (!isFinalWebhookStatus(resolvedStatus)) {
      return {
        handled: true,
        duplicate: false,
        status: resolvedStatus,
        intentId: intent.id,
        message: `PayPal one-time event "${eventType}" did not resolve to a final fulfillment status.`
      };
    }

    await syncCheckoutOrderStatusForPayPalWebhook({
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
          provider: 'paypal',
          intentId: intent.id,
          intentKey: intent.intentKey,
          status: resolvedStatus,
          requestedStatus: fulfillment.requestedStatus,
          eventType,
          webhookEventId: eventId
        },
        {
          moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
          source: '/modules/mod.commerce.one-time-payments/webhooks/paypal',
          teamId: intent.targetType === 'team' ? intent.targetTeamId : null,
          targetUserId:
            intent.targetType === 'user' ? intent.targetUserId : null
        }
      );
    } catch (error) {
      console.warn(
        '[mod.commerce.one-time-payments] Unable to emit fulfillmentUpdated event (paypal)',
        error
      );
    }

    await resolvedDeps.recordCheckoutEvent({
      provider: 'paypal',
      orderType: 'one_time',
      moduleId: COMMERCE_ONE_TIME_PAYMENTS_MODULE_ID,
      status: mapWebhookOrderStatus(resolvedStatus),
      eventType,
      source: 'webhook',
      teamId: intent.targetType === 'team' ? intent.targetTeamId : null,
      targetType: intent.targetType,
      targetTeamId: intent.targetTeamId,
      targetUserId: intent.targetUserId,
      subscriptionTemplateId: null,
      paymentMethod: 'paypal',
      planName: snapshot.productName,
      providerPlanId: snapshot.providerPriceId,
      externalOrderId: orderId,
      externalPaymentId,
      amount,
      currency,
      message: `PayPal one-time event processed: ${eventType}.`,
      metadata: {
        oneTimeIntentId: intent.id,
        oneTimeIntentKey: intent.intentKey,
        fulfillmentStatus: resolvedStatus
      },
      providerMetadata: {
        orderId,
        captureId,
        webhookEventId: eventId
      }
    });

    return {
      handled: true,
      duplicate: false,
      status: resolvedStatus,
      intentId: intent.id,
      message: `PayPal one-time event "${eventType}" processed.`
    };
  };
}

export const processOneTimePayPalWebhookEvent =
  createProcessOneTimePayPalWebhookEvent({
    getCheckoutOrderByProviderSession,
    markCheckoutOrderCompleted,
    markCheckoutOrderFailed,
    markCheckoutOrderCanceled
  });
