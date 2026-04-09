import Stripe from 'stripe';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import {
  createCheckoutTemplateSnapshot,
  recordPayPalCheckoutEvent,
  recordStripeCheckoutEvent
} from '@/lib/payments/checkout-system';
import { getPaymentConfigValue } from '@/lib/payments/config';
import { createPaymentLog } from '@/lib/payments/logs';
import { mapSubscriptionStatusToOrderStatus } from '@/lib/payments/orders';
import {
  buildPayPalCheckoutTargetCustomId,
  confirmPayPalSubscriptionForTeam,
  getPayPalAccessToken,
  getPayPalApiBaseUrl,
  handlePayPalWebhookEvent,
  isPayPalConfigured,
  resolvePayPalOneTimeWebhookDetails,
  type PayPalWebhookEvent
} from '@/lib/payments/paypal';
import {
  getCheckoutOrderByProviderSession,
  getCheckoutOrderByToken,
  isCheckoutOrderSignupIntent,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed,
  markCheckoutOrderProviderPending,
  type CheckoutOrderWithMetadata
} from '@/lib/payments/checkout-orders';
import {
  getStripeClient,
  handleSubscriptionChange
} from '@/lib/payments/stripe';
import {
  finalizeSignupIntentCheckout,
  getSignupIntentCheckoutAccessByToken,
  parsePayPalSignupIntentCustomId
} from '@/lib/payments/signup-intents';
import type { ModulePaymentMethodActionResult } from './payment-methods';

type CoreCheckoutWebhookActionSuccess = {
  ok: true;
  result: ModulePaymentMethodActionResult;
  checkoutOrder: CheckoutOrderWithMetadata | null;
};

type CoreCheckoutWebhookActionFailure = {
  ok: false;
  statusCode: number;
  error: string;
};

export type CoreCheckoutWebhookActionResult =
  | CoreCheckoutWebhookActionSuccess
  | CoreCheckoutWebhookActionFailure;

type VerifyWebhookResponse = {
  verification_status?: string;
};

const PAYPAL_IGNORED_WEBHOOK_EVENT_MESSAGE = 'PayPal webhook event ignored.';

function toIsoDateFromUnix(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function normalizeCheckoutToken(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 120);
}

export function canReuseConvergedOneTimeCheckoutWebhook({
  checkoutOrder,
  provider,
  nextStatus,
  providerSessionId = null,
  providerReferenceId = null
}: {
  checkoutOrder: CheckoutOrderWithMetadata | null;
  provider: 'stripe' | 'paypal';
  nextStatus: 'completed' | 'provider_pending' | 'failed';
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
}) {
  if (!checkoutOrder || checkoutOrder.orderType !== 'one_time') {
    return false;
  }

  if (nextStatus === 'completed' && checkoutOrder.status !== 'completed') {
    return false;
  }

  if (
    nextStatus === 'provider_pending' &&
    checkoutOrder.status !== 'provider_pending'
  ) {
    return false;
  }

  if (nextStatus === 'failed' && checkoutOrder.status !== 'failed') {
    return false;
  }

  if (
    checkoutOrder.selectedProvider &&
    checkoutOrder.selectedProvider !== provider
  ) {
    return false;
  }

  const identifiers = [providerSessionId, providerReferenceId].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );

  if (identifiers.length === 0) {
    return true;
  }

  return identifiers.some(
    (value) =>
      checkoutOrder.providerSessionId === value ||
      checkoutOrder.providerReferenceId === value
  );
}

async function refreshCheckoutOrderByToken(checkoutToken: string | null | undefined) {
  const normalizedCheckoutToken = normalizeCheckoutToken(checkoutToken);
  if (!normalizedCheckoutToken) {
    return null;
  }

  return getCheckoutOrderByToken(normalizedCheckoutToken);
}

function buildWebhookActionSuccess({
  paymentMethod,
  checkoutOrder,
  checkoutToken = null,
  status,
  message,
  eventType,
  providerReferenceId = null,
  externalOrderId = null,
  externalPaymentId = null,
  providerPlanId = null,
  metadata = null
}: {
  paymentMethod: 'stripe' | 'paypal';
  checkoutOrder: CheckoutOrderWithMetadata | null;
  checkoutToken?: string | null;
  status: 'completed' | 'ignored' | 'failed' | 'provider_pending';
  message: string;
  eventType: string | null;
  providerReferenceId?: string | null;
  externalOrderId?: string | null;
  externalPaymentId?: string | null;
  providerPlanId?: string | null;
  metadata?: Record<string, unknown> | null;
}): CoreCheckoutWebhookActionSuccess {
  const resolvedCheckoutToken =
    checkoutOrder?.checkoutToken ?? normalizeCheckoutToken(checkoutToken);

  return {
    ok: true,
    result: {
      status,
      checkoutToken: resolvedCheckoutToken,
      checkoutOrderId: checkoutOrder?.id ?? null,
      paymentMethod,
      providerReferenceId,
      externalOrderId,
      externalPaymentId,
      providerPlanId,
      eventType,
      message,
      metadata
    },
    checkoutOrder
  };
}

async function verifyPayPalWebhookSignature(
  request: Request,
  event: PayPalWebhookEvent,
  webhookId: string
) {
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return false;
  }

  const verificationResponse = await fetch(
    `${await getPayPalApiBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: request.headers.get('paypal-auth-algo'),
        cert_url: request.headers.get('paypal-cert-url'),
        transmission_id: request.headers.get('paypal-transmission-id'),
        transmission_sig: request.headers.get('paypal-transmission-sig'),
        transmission_time: request.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: event
      })
    }
  );

  if (!verificationResponse.ok) {
    return false;
  }

  const verificationBody =
    (await verificationResponse.json()) as VerifyWebhookResponse;
  return verificationBody.verification_status === 'SUCCESS';
}

export async function executeStripeCheckoutWebhookAction({
  request,
  fallbackCheckoutToken = null,
  source = '/api/checkout/methods/stripe/webhook'
}: {
  request: Request;
  fallbackCheckoutToken?: string | null;
  source?: string;
}): Promise<CoreCheckoutWebhookActionResult> {
  const [stripe, webhookSecret] = await Promise.all([
    getStripeClient(),
    getPaymentConfigValue('stripeWebhookSecret')
  ]);

  if (!stripe || !webhookSecret) {
    return {
      ok: false,
      statusCode: 503,
      error: 'Stripe webhook is not configured.'
    };
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'stripe',
        reason: 'signature_verification_failed'
      },
      { source }
    );
    await createPaymentLog({
      provider: 'stripe',
      eventType: 'webhook.signature_failed',
      status: 'failed',
      message: 'Webhook signature verification failed.',
      payload: {
        hasSignatureHeader: Boolean(signature)
      }
    });
    console.error('Webhook signature verification failed.', error);
    return {
      ok: false,
      statusCode: 400,
      error: 'Webhook signature verification failed.'
    };
  }

  await emitEventAsync(
    EVENT_HOOKS.checkoutWebhookReceived,
    { provider: 'stripe', eventType: event.type, eventId: event.id },
    { source }
  );

  let checkoutOrder =
    await refreshCheckoutOrderByToken(fallbackCheckoutToken);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const checkoutToken =
          normalizeCheckoutToken(session.metadata?.checkout_token) ||
          normalizeCheckoutToken(fallbackCheckoutToken);
        checkoutOrder =
          (await refreshCheckoutOrderByToken(checkoutToken)) ?? checkoutOrder;

        if (session.mode !== 'payment') {
          if (!checkoutOrder || !isCheckoutOrderSignupIntent(checkoutOrder)) {
            return buildWebhookActionSuccess({
              paymentMethod: 'stripe',
              checkoutOrder,
              checkoutToken: fallbackCheckoutToken,
              status: 'ignored',
              eventType: event.type,
              externalOrderId: event.id,
              message: 'Stripe checkout session event ignored.',
              metadata: {
                received: true,
                handled: false
              }
            });
          }

          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id ?? null;
          if (!subscriptionId) {
            return buildWebhookActionSuccess({
              paymentMethod: 'stripe',
              checkoutOrder,
              checkoutToken,
              status: 'ignored',
              eventType: event.type,
              externalOrderId: event.id,
              message: 'Stripe signup checkout session is missing a subscription.',
              metadata: {
                received: true,
                handled: false
              }
            });
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price.product']
          });
          const subscriptionItem = subscription.items.data[0];
          const plan = subscriptionItem?.price;
          const stripeProduct = plan?.product;
          const productId =
            typeof stripeProduct === 'string' ? stripeProduct : stripeProduct?.id ?? null;
          const productName =
            typeof stripeProduct !== 'string' && stripeProduct && 'name' in stripeProduct
              ? stripeProduct.name
              : null;
          const providerPlanId = plan?.id ?? null;
          const currentPeriodStart = toIsoDateFromUnix(
            subscriptionItem?.current_period_start
          );
          const currentPeriodEnd = toIsoDateFromUnix(
            subscriptionItem?.current_period_end
          );
          const trialEndsAt = toIsoDateFromUnix(subscription.trial_end ?? null);
          const canceledAt = toIsoDateFromUnix(subscription.canceled_at ?? null);
          const template = checkoutOrder.subscriptionTemplateId
            ? await getSubscriptionTemplateById(checkoutOrder.subscriptionTemplateId)
            : null;
          const templateSnapshot = template
            ? createCheckoutTemplateSnapshot(template)
            : null;

          if (checkoutOrder.id) {
            await markCheckoutOrderCompleted({
              checkoutOrderId: checkoutOrder.id,
              provider: 'stripe',
              providerReferenceId: subscriptionId
            });
            checkoutOrder =
              (await refreshCheckoutOrderByToken(checkoutToken)) ?? checkoutOrder;
          }

          const finalizedSignup = await finalizeSignupIntentCheckout({
            checkoutOrder,
            paymentProvider: 'stripe',
            providerReferenceId: subscriptionId,
            providerPlanId,
            paymentMethod: session.payment_method_types?.[0] || 'card',
            planName: template?.name || productName || checkoutOrder.planName,
            subscriptionStatus: subscription.status,
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
            canceledAt,
            source
          });
          const signupTargetType =
            finalizedSignup?.signupIntent?.targetScope === 'organization'
              ? 'team'
              : 'user';
          const signupTargetTeamId =
            signupTargetType === 'team' ? finalizedSignup?.teamId ?? null : null;
          const signupTargetUserId =
            signupTargetType === 'user'
              ? finalizedSignup?.createdUser?.id ?? null
              : null;

          await recordStripeCheckoutEvent({
            orderType: 'subscription',
            status: mapSubscriptionStatusToOrderStatus(subscription.status),
            logStatus: 'success',
            eventType: event.type,
            source: 'webhook',
            teamId: signupTargetTeamId,
            targetType: signupTargetType,
            targetTeamId: signupTargetTeamId,
            targetUserId: signupTargetUserId,
            subscriptionTemplateId: template?.id ?? checkoutOrder.subscriptionTemplateId,
            templateSnapshot,
            paymentMethod: session.payment_method_types?.[0] || 'card',
            planName: template?.name || productName || checkoutOrder.planName,
            providerPlanId,
            externalOrderId: event.id,
            externalPaymentId: subscriptionId,
            externalLogId: event.id,
            amount: plan?.unit_amount ?? checkoutOrder.amount ?? null,
            currency: plan?.currency ?? checkoutOrder.currency ?? null,
            message: 'Stripe signup checkout webhook processed.',
            metadata: {
              handled: true,
              checkoutToken,
              signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
            },
            providerMetadata: {
              sessionId: session.id,
              customerId:
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id ?? null,
              productId,
              subscriptionId,
              webhookEventId: event.id,
              currentPeriodStart,
              currentPeriodEnd,
              trialEndsAt,
              cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
              canceledAt
            }
          });

          await emitEventAsync(
            EVENT_HOOKS.checkoutWebhookProcessed,
            { provider: 'stripe', eventType: event.type, eventId: event.id },
            { source }
          );

          return buildWebhookActionSuccess({
            paymentMethod: 'stripe',
            checkoutOrder,
            checkoutToken,
            status: 'completed',
            eventType: event.type,
            providerReferenceId: subscriptionId,
            externalOrderId: event.id,
            externalPaymentId: subscriptionId,
            providerPlanId,
            message: 'Stripe signup checkout webhook processed.',
            metadata: {
              received: true,
              handled: true,
              subscriptionStatus: subscription.status
            }
          });
        }

        if (!checkoutOrder || checkoutOrder.orderType !== 'one_time') {
          return buildWebhookActionSuccess({
            paymentMethod: 'stripe',
            checkoutOrder,
            checkoutToken,
            status: 'ignored',
            eventType: event.type,
            externalOrderId: event.id,
            message: 'Stripe one-time checkout event ignored.',
            metadata: {
              received: true,
              handled: false
            }
          });
        }

        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        const handled =
          session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required';
        const resolvedOneTimeStatus = handled ? 'completed' : 'provider_pending';

        if (
          canReuseConvergedOneTimeCheckoutWebhook({
            checkoutOrder,
            provider: 'stripe',
            nextStatus: resolvedOneTimeStatus,
            providerSessionId: session.id,
            providerReferenceId: paymentIntentId ?? session.id
          })
        ) {
          return buildWebhookActionSuccess({
            paymentMethod: 'stripe',
            checkoutOrder,
            checkoutToken,
            status: handled ? 'completed' : 'provider_pending',
            eventType: event.type,
            providerReferenceId: paymentIntentId ?? session.id,
            externalOrderId: session.id,
            externalPaymentId: paymentIntentId ?? session.id,
            message: handled
              ? 'Stripe one-time checkout webhook replay reused existing completed order.'
              : 'Stripe one-time checkout webhook replay reused existing provider-pending order.',
            metadata: {
              received: true,
              handled,
              replayed: true,
              paymentStatus: session.payment_status
            }
          });
        }

        await recordStripeCheckoutEvent({
          orderType: 'one_time',
          status: handled ? 'received' : 'pending',
          logStatus: handled ? 'success' : 'failed',
          persistOrder: handled,
          eventType: event.type,
          source: 'webhook',
          teamId:
            checkoutOrder.targetType === 'team'
              ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
              : null,
          targetType:
            checkoutOrder.targetType === 'team' || checkoutOrder.targetType === 'user'
              ? checkoutOrder.targetType
              : null,
          targetTeamId:
            checkoutOrder.targetType === 'team'
              ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
              : null,
          targetUserId:
            checkoutOrder.targetType === 'user' ? checkoutOrder.targetUserId : null,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          planName: checkoutOrder.planName,
          externalOrderId: session.id,
          externalPaymentId: paymentIntentId ?? session.id,
          externalLogId: event.id,
          amount: session.amount_total ?? checkoutOrder.amount ?? null,
          currency: session.currency ?? checkoutOrder.currency ?? null,
          message: handled
            ? 'Stripe one-time checkout event processed.'
            : 'Stripe one-time checkout event ignored.',
          metadata: {
            paymentStatus: session.payment_status,
            handled
          },
          providerMetadata: {
            sessionId: session.id,
            paymentIntentId,
            webhookEventId: event.id
          }
        });

        if (handled) {
          await markCheckoutOrderCompleted({
            checkoutOrderId: checkoutOrder.id,
            provider: 'stripe',
            providerReferenceId: paymentIntentId ?? session.id
          });
          checkoutOrder =
            (await refreshCheckoutOrderByToken(checkoutToken)) ?? checkoutOrder;
        }

        await emitEventAsync(
          EVENT_HOOKS.checkoutWebhookProcessed,
          { provider: 'stripe', eventType: event.type, eventId: event.id },
          { source }
        );

        return buildWebhookActionSuccess({
          paymentMethod: 'stripe',
          checkoutOrder,
          checkoutToken,
          status: handled ? 'completed' : 'ignored',
          eventType: event.type,
          providerReferenceId: paymentIntentId ?? session.id,
          externalOrderId: session.id,
          externalPaymentId: paymentIntentId ?? session.id,
          message: handled
            ? 'Stripe one-time checkout event processed.'
            : 'Stripe one-time checkout event ignored.',
          metadata: {
            received: true,
            handled,
            paymentStatus: session.payment_status
          }
        });
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await handleSubscriptionChange(subscription);
        const firstItem = subscription.items.data[0];
        const price = firstItem?.price;
        const currentPeriodStart = toIsoDateFromUnix(
          firstItem?.current_period_start
        );
        const currentPeriodEnd = toIsoDateFromUnix(
          firstItem?.current_period_end
        );
        const trialEndsAt = toIsoDateFromUnix(subscription.trial_end ?? null);
        const canceledAt = toIsoDateFromUnix(subscription.canceled_at ?? null);
        const checkoutToken =
          normalizeCheckoutToken(subscription.metadata?.checkout_token) ||
          normalizeCheckoutToken(fallbackCheckoutToken);

        await recordStripeCheckoutEvent({
          orderType: 'subscription',
          status: result.handled
            ? mapSubscriptionStatusToOrderStatus(result.subscriptionStatus)
            : 'failed',
          logStatus: result.handled ? 'success' : 'failed',
          eventType: event.type,
          source: 'webhook',
          teamId: result.targetType === 'team' ? result.targetTeamId : null,
          targetType: result.targetType,
          targetTeamId: result.targetTeamId,
          targetUserId: result.targetUserId,
          paymentMethod: 'card',
          planName: price?.nickname || null,
          providerPlanId: price?.id || null,
          externalOrderId: event.id,
          externalPaymentId: subscription.id,
          externalLogId: event.id,
          amount: price?.unit_amount,
          currency: price?.currency || null,
          message: result.handled
            ? 'Stripe subscription event processed.'
            : 'Stripe subscription event ignored.',
          metadata: {
            subscriptionStatus: result.subscriptionStatus
          },
          providerMetadata: {
            subscriptionId: subscription.id,
            webhookEventId: event.id,
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
            canceledAt
          }
        });

        checkoutOrder =
          (await refreshCheckoutOrderByToken(checkoutToken)) ??
          checkoutOrder;

        await emitEventAsync(
          EVENT_HOOKS.checkoutWebhookProcessed,
          { provider: 'stripe', eventType: event.type, eventId: event.id },
          { source }
        );

        return buildWebhookActionSuccess({
          paymentMethod: 'stripe',
          checkoutOrder,
          checkoutToken,
          status: result.handled ? 'completed' : 'ignored',
          eventType: event.type,
          providerReferenceId: subscription.id,
          externalOrderId: event.id,
          externalPaymentId: subscription.id,
          providerPlanId: price?.id || null,
          message: result.handled
            ? 'Stripe subscription event processed.'
            : 'Stripe subscription event ignored.',
          metadata: {
            received: true,
            handled: result.handled,
            subscriptionStatus: result.subscriptionStatus
          }
        });
      }

      default:
        await createPaymentLog({
          provider: 'stripe',
          eventType: event.type,
          status: 'info',
          externalId: event.id,
          message: `Unhandled event type ${event.type}`
        });
        console.log(`Unhandled event type ${event.type}`);

        await emitEventAsync(
          EVENT_HOOKS.checkoutWebhookProcessed,
          { provider: 'stripe', eventType: event.type, eventId: event.id },
          { source }
        );

        return buildWebhookActionSuccess({
          paymentMethod: 'stripe',
          checkoutOrder,
          checkoutToken: fallbackCheckoutToken,
          status: 'ignored',
          eventType: event.type,
          externalOrderId: event.id,
          message: `Unhandled event type ${event.type}`,
          metadata: {
            received: true,
            handled: false
          }
        });
    }
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'stripe',
        eventType: event.type,
        eventId: event.id,
        reason: 'handler_error'
      },
      { source }
    );
    console.error('Error handling Stripe webhook event:', error);
    return {
      ok: false,
      statusCode: 500,
      error: 'Webhook handling failed.'
    };
  }
}

export async function executePayPalCheckoutWebhookAction({
  request,
  fallbackCheckoutToken = null,
  source = '/api/checkout/methods/paypal/webhook'
}: {
  request: Request;
  fallbackCheckoutToken?: string | null;
  source?: string;
}): Promise<CoreCheckoutWebhookActionResult> {
  if (!(await isPayPalConfigured())) {
    return {
      ok: false,
      statusCode: 503,
      error: 'PayPal is not configured.'
    };
  }

  const payload = await request.text();
  let event: PayPalWebhookEvent;

  try {
    event = JSON.parse(payload) as PayPalWebhookEvent;
  } catch {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      { provider: 'paypal', reason: 'invalid_payload' },
      { source }
    );
    await createPaymentLog({
      provider: 'paypal',
      eventType: 'webhook.invalid_payload',
      status: 'failed',
      message: 'Invalid JSON payload.'
    });
    return {
      ok: false,
      statusCode: 400,
      error: 'Invalid payload.'
    };
  }

  const webhookId = await getPaymentConfigValue('paypalWebhookId');
  if (webhookId) {
    const isValid = await verifyPayPalWebhookSignature(
      request,
      event,
      webhookId
    );
    if (!isValid) {
      await emitEventAsync(
        EVENT_HOOKS.checkoutWebhookFailed,
        {
          provider: 'paypal',
          eventType: event.event_type || null,
          eventId: request.headers.get('paypal-transmission-id'),
          reason: 'signature_verification_failed'
        },
        { source }
      );
      await createPaymentLog({
        provider: 'paypal',
        eventType: event.event_type || 'webhook.invalid_signature',
        status: 'failed',
        externalId: event.resource?.id || null,
        message: 'Invalid PayPal webhook signature.'
      });
      return {
        ok: false,
        statusCode: 400,
        error: 'Invalid PayPal webhook signature.'
      };
    }
  }

  await emitEventAsync(
    EVENT_HOOKS.checkoutWebhookReceived,
    {
      provider: 'paypal',
      eventType: event.event_type || null,
      eventId: request.headers.get('paypal-transmission-id')
    },
    { source }
  );

  let checkoutOrder =
    await refreshCheckoutOrderByToken(fallbackCheckoutToken);

  try {
    const oneTimeDetails = resolvePayPalOneTimeWebhookDetails(event);
    if (oneTimeDetails) {
      checkoutOrder =
        (await getCheckoutOrderByProviderSession({
          provider: 'paypal',
          providerSessionId: oneTimeDetails.orderId
        })) ?? checkoutOrder;

      if (!checkoutOrder || checkoutOrder.orderType !== 'one_time') {
        await emitEventAsync(
          EVENT_HOOKS.checkoutWebhookProcessed,
          {
            provider: 'paypal',
            eventType: oneTimeDetails.eventType,
            eventId: request.headers.get('paypal-transmission-id')
          },
          { source }
        );

        return buildWebhookActionSuccess({
          paymentMethod: 'paypal',
          checkoutOrder,
          checkoutToken: fallbackCheckoutToken,
          status: 'ignored',
          eventType: oneTimeDetails.eventType,
          providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId,
          externalOrderId: oneTimeDetails.orderId,
          externalPaymentId: oneTimeDetails.captureId ?? null,
          message: 'PayPal one-time webhook event ignored.',
          metadata: {
            received: true,
            handled: false
          }
        });
      }

      const expectedCustomId = buildPayPalCheckoutTargetCustomId({
        targetType: checkoutOrder.targetType === 'user' ? 'user' : 'team',
        targetTeamId:
          checkoutOrder.targetType === 'team'
            ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
            : null,
        targetUserId:
          checkoutOrder.targetType === 'user' ? checkoutOrder.targetUserId : null
      });
      const hasCustomIdMismatch =
        expectedCustomId &&
        oneTimeDetails.customId &&
        expectedCustomId !== oneTimeDetails.customId;
      const resolvedOneTimeStatus =
        hasCustomIdMismatch || oneTimeDetails.status === 'failed'
          ? 'failed'
          : oneTimeDetails.status === 'received'
            ? 'completed'
            : 'provider_pending';

      if (
        canReuseConvergedOneTimeCheckoutWebhook({
          checkoutOrder,
          provider: 'paypal',
          nextStatus: resolvedOneTimeStatus,
          providerSessionId: oneTimeDetails.orderId,
          providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId
        })
      ) {
        return buildWebhookActionSuccess({
          paymentMethod: 'paypal',
          checkoutOrder,
          checkoutToken: fallbackCheckoutToken,
          status: resolvedOneTimeStatus,
          eventType: oneTimeDetails.eventType,
          providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId,
          externalOrderId: oneTimeDetails.orderId,
          externalPaymentId: oneTimeDetails.captureId ?? null,
          message:
            resolvedOneTimeStatus === 'completed'
              ? 'PayPal one-time webhook replay reused existing completed order.'
              : resolvedOneTimeStatus === 'provider_pending'
                ? 'PayPal one-time webhook replay reused existing provider-pending order.'
                : 'PayPal one-time webhook replay reused existing failed order.',
          metadata: {
            received: true,
            handled:
              resolvedOneTimeStatus === 'completed' ||
              resolvedOneTimeStatus === 'provider_pending',
            replayed: true,
            paymentStatus: oneTimeDetails.status
          }
        });
      }

      await recordPayPalCheckoutEvent({
        orderType: 'one_time',
        status: hasCustomIdMismatch ? 'failed' : oneTimeDetails.status,
        logStatus: hasCustomIdMismatch ? 'failed' : oneTimeDetails.logStatus,
        persistOrder: !hasCustomIdMismatch,
        eventType: oneTimeDetails.eventType,
        source: 'webhook',
        teamId:
          checkoutOrder.targetType === 'team'
            ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
            : null,
        targetType:
          checkoutOrder.targetType === 'team' || checkoutOrder.targetType === 'user'
            ? checkoutOrder.targetType
            : null,
        targetTeamId:
          checkoutOrder.targetType === 'team'
            ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
            : null,
        targetUserId:
          checkoutOrder.targetType === 'user' ? checkoutOrder.targetUserId : null,
        paymentMethod: 'paypal',
        planName: checkoutOrder.planName,
        externalOrderId: oneTimeDetails.orderId,
        externalPaymentId: oneTimeDetails.captureId ?? null,
        externalLogId: request.headers.get('paypal-transmission-id'),
        amount: oneTimeDetails.amount ?? checkoutOrder.amount ?? null,
        currency: oneTimeDetails.currency ?? checkoutOrder.currency ?? null,
        message: hasCustomIdMismatch
          ? 'PayPal one-time webhook target mismatch.'
          : oneTimeDetails.status === 'received'
            ? 'PayPal one-time capture completed.'
            : oneTimeDetails.status === 'pending'
              ? 'PayPal one-time capture is pending.'
              : 'PayPal one-time capture failed.',
        metadata: {
          handled: !hasCustomIdMismatch,
          customId: oneTimeDetails.customId,
          expectedCustomId
        },
        providerMetadata: {
          orderId: oneTimeDetails.orderId,
          webhookEventId: request.headers.get('paypal-transmission-id')
        }
      });

      if (hasCustomIdMismatch || oneTimeDetails.status === 'failed') {
        await markCheckoutOrderFailed({
          checkoutOrderId: checkoutOrder.id,
          provider: 'paypal',
          providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId
        });
        checkoutOrder =
          (await getCheckoutOrderByProviderSession({
            provider: 'paypal',
            providerSessionId: oneTimeDetails.orderId
          })) ?? checkoutOrder;
      } else if (oneTimeDetails.status === 'pending') {
        await markCheckoutOrderProviderPending({
          checkoutOrderId: checkoutOrder.id,
          provider: 'paypal',
          paymentMethod: 'paypal',
          providerSessionId: oneTimeDetails.orderId
        });
        checkoutOrder =
          (await getCheckoutOrderByProviderSession({
            provider: 'paypal',
            providerSessionId: oneTimeDetails.orderId
          })) ?? checkoutOrder;
      } else if (oneTimeDetails.status === 'received') {
        await markCheckoutOrderCompleted({
          checkoutOrderId: checkoutOrder.id,
          provider: 'paypal',
          providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId
        });
        checkoutOrder =
          (await getCheckoutOrderByProviderSession({
            provider: 'paypal',
            providerSessionId: oneTimeDetails.orderId
          })) ?? checkoutOrder;
      }

      await emitEventAsync(
        EVENT_HOOKS.checkoutWebhookProcessed,
        {
          provider: 'paypal',
          eventType: oneTimeDetails.eventType,
          eventId: request.headers.get('paypal-transmission-id')
        },
        { source }
      );

      return buildWebhookActionSuccess({
        paymentMethod: 'paypal',
        checkoutOrder,
        checkoutToken: fallbackCheckoutToken,
        status:
          hasCustomIdMismatch || oneTimeDetails.status === 'failed'
            ? 'failed'
            : oneTimeDetails.status === 'received'
              ? 'completed'
              : 'provider_pending',
        eventType: oneTimeDetails.eventType,
        providerReferenceId: oneTimeDetails.captureId ?? oneTimeDetails.orderId,
        externalOrderId: oneTimeDetails.orderId,
        externalPaymentId: oneTimeDetails.captureId ?? null,
        message: hasCustomIdMismatch
          ? 'PayPal one-time webhook target mismatch.'
          : oneTimeDetails.status === 'received'
            ? 'PayPal one-time capture completed.'
            : oneTimeDetails.status === 'pending'
              ? 'PayPal one-time capture is pending.'
              : 'PayPal one-time capture failed.',
        metadata: {
          received: true,
          handled:
            !hasCustomIdMismatch &&
            (oneTimeDetails.status === 'received' ||
              oneTimeDetails.status === 'pending'),
          paymentStatus: oneTimeDetails.status
        }
      });
    }

    const signupIntentCustomId = parsePayPalSignupIntentCustomId(
      event.resource?.custom_id ?? null
    );
    if (signupIntentCustomId) {
      const signupIntentAccess = await getSignupIntentCheckoutAccessByToken(
        signupIntentCustomId.checkoutToken
      );
      checkoutOrder = signupIntentAccess?.checkoutOrder ?? checkoutOrder;

      if (
        checkoutOrder &&
        isCheckoutOrderSignupIntent(checkoutOrder) &&
        event.resource?.id
      ) {
        const template = checkoutOrder.subscriptionTemplateId
          ? await getSubscriptionTemplateById(checkoutOrder.subscriptionTemplateId)
          : null;
        const confirmedSubscription = await confirmPayPalSubscriptionForTeam({
          teamId: 0,
          subscriptionId: event.resource.id,
          template
        });

        if (checkoutOrder.id) {
          await markCheckoutOrderCompleted({
            checkoutOrderId: checkoutOrder.id,
            provider: 'paypal',
            providerReferenceId: event.resource.id
          });
          checkoutOrder =
            (await refreshCheckoutOrderByToken(signupIntentCustomId.checkoutToken)) ??
            checkoutOrder;
        }

        const finalizedSignup = await finalizeSignupIntentCheckout({
          checkoutOrder,
          paymentProvider: 'paypal',
          providerReferenceId: event.resource.id,
          providerPlanId: confirmedSubscription.planId,
          paymentMethod: 'paypal',
          planName: confirmedSubscription.planName || template?.name || checkoutOrder.planName,
          subscriptionStatus: confirmedSubscription.subscriptionStatus,
          currentPeriodStart: confirmedSubscription.currentPeriodStart,
          currentPeriodEnd: confirmedSubscription.currentPeriodEnd,
          source
        });
        const signupTargetType =
          finalizedSignup?.signupIntent?.targetScope === 'organization'
            ? 'team'
            : 'user';
        const signupTargetTeamId =
          signupTargetType === 'team' ? finalizedSignup?.teamId ?? null : null;
        const signupTargetUserId =
          signupTargetType === 'user' ? finalizedSignup?.createdUser?.id ?? null : null;

        await recordPayPalCheckoutEvent({
          orderType: 'subscription',
          status: mapSubscriptionStatusToOrderStatus(
            confirmedSubscription.subscriptionStatus
          ),
          logStatus: 'success',
          persistOrder: true,
          eventType: event.event_type || 'webhook.event',
          source: 'webhook',
          teamId: signupTargetTeamId,
          targetType: signupTargetType,
          targetTeamId: signupTargetTeamId,
          targetUserId: signupTargetUserId,
          subscriptionTemplateId: template?.id ?? checkoutOrder.subscriptionTemplateId,
          templateSnapshot: template
            ? createCheckoutTemplateSnapshot(template)
            : null,
          paymentMethod: 'paypal',
          planName: confirmedSubscription.planName ?? template?.name ?? null,
          providerPlanId: confirmedSubscription.planId,
          externalPaymentId: event.resource.id,
          externalLogId: request.headers.get('paypal-transmission-id'),
          message: 'PayPal signup webhook event processed.',
          metadata: {
            subscriptionStatus: confirmedSubscription.subscriptionStatus,
            handled: true,
            signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
          },
          providerMetadata: {
            subscriptionId: event.resource.id,
            planId: confirmedSubscription.planId,
            webhookEventId: request.headers.get('paypal-transmission-id'),
            currentPeriodStart: confirmedSubscription.currentPeriodStart,
            currentPeriodEnd: confirmedSubscription.currentPeriodEnd
          }
        });

        await emitEventAsync(
          EVENT_HOOKS.checkoutWebhookProcessed,
          {
            provider: 'paypal',
            eventType: event.event_type || null,
            eventId: request.headers.get('paypal-transmission-id')
          },
          { source }
        );

        return buildWebhookActionSuccess({
          paymentMethod: 'paypal',
          checkoutOrder,
          checkoutToken: signupIntentCustomId.checkoutToken,
          status: 'completed',
          eventType: event.event_type || 'webhook.event',
          providerReferenceId: event.resource.id,
          externalPaymentId: event.resource.id,
          providerPlanId: confirmedSubscription.planId,
          message: 'PayPal signup webhook event processed.',
          metadata: {
            received: true,
            handled: true,
            subscriptionStatus: confirmedSubscription.subscriptionStatus
          }
        });
      }
    }

    const result = await handlePayPalWebhookEvent(event);
    const handled = result.handled;
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: handled
        ? mapSubscriptionStatusToOrderStatus(result.subscriptionStatus)
        : 'pending',
      logStatus: handled ? 'success' : 'failed',
      persistOrder: handled,
      eventType: event.event_type || 'webhook.event',
      source: 'webhook',
      teamId: result.targetType === 'team' ? result.targetTeamId : null,
      targetType: result.targetType,
      targetTeamId: result.targetTeamId,
      targetUserId: result.targetUserId,
      paymentMethod: 'paypal',
      planName: result.planName ?? null,
      providerPlanId: event.resource?.plan_id || null,
      externalPaymentId: event.resource?.id || null,
      externalLogId: request.headers.get('paypal-transmission-id'),
      message: handled
        ? 'PayPal webhook event processed.'
        : PAYPAL_IGNORED_WEBHOOK_EVENT_MESSAGE,
      metadata: {
        subscriptionStatus: result.subscriptionStatus,
        handled
      },
      providerMetadata: {
        subscriptionId: event.resource?.id || null,
        planId: event.resource?.plan_id || null,
        webhookEventId: request.headers.get('paypal-transmission-id'),
        currentPeriodStart: result.currentPeriodStart,
        currentPeriodEnd: result.currentPeriodEnd
      }
    });

    checkoutOrder =
      (await refreshCheckoutOrderByToken(fallbackCheckoutToken)) ??
      checkoutOrder;

    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookProcessed,
      {
        provider: 'paypal',
        eventType: event.event_type || null,
        eventId: request.headers.get('paypal-transmission-id')
      },
      { source }
    );

    return buildWebhookActionSuccess({
      paymentMethod: 'paypal',
      checkoutOrder,
      checkoutToken: fallbackCheckoutToken,
      status: handled ? 'completed' : 'ignored',
      eventType: event.event_type || 'webhook.event',
      providerReferenceId: event.resource?.id || null,
      externalPaymentId: event.resource?.id || null,
      providerPlanId: event.resource?.plan_id || null,
      message: handled
        ? 'PayPal webhook event processed.'
        : PAYPAL_IGNORED_WEBHOOK_EVENT_MESSAGE,
      metadata: {
        received: true,
        handled,
        subscriptionStatus: result.subscriptionStatus
      }
    });
  } catch (error) {
    await emitEventAsync(
      EVENT_HOOKS.checkoutWebhookFailed,
      {
        provider: 'paypal',
        eventType: event.event_type || null,
        eventId: request.headers.get('paypal-transmission-id'),
        reason: 'handler_error'
      },
      { source }
    );
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: 'pending',
      logStatus: 'failed',
      persistOrder: false,
      eventType: event.event_type || 'webhook.event',
      source: 'webhook',
      externalPaymentId: event.resource?.id || null,
      externalLogId: request.headers.get('paypal-transmission-id'),
      metadata: {
        handled: false,
        reason: 'handler_error'
      },
      providerMetadata: {
        subscriptionId: event.resource?.id || null,
        webhookEventId: request.headers.get('paypal-transmission-id')
      },
      message: 'Error handling PayPal webhook event.'
    });
    console.error('Error handling PayPal webhook event:', error);
    return {
      ok: false,
      statusCode: 500,
      error: 'Webhook handling failed.'
    };
  }
}
