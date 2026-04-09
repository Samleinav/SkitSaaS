import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import {
  getActiveUserSubscriptionAssignment,
  getActiveTeamSubscriptionAssignment,
  getSubscriptionTemplateById,
  getTeamById,
  getTeamForUser,
  getUser
} from '@/lib/db/queries';
import { setSession } from '@/lib/auth/session';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { createSubscriptionChangeRequest } from '@/lib/payments/subscription-change';
import {
  classifySubscriptionPlanRelation,
  normalizeSubscriptionPlanRelation,
  resolveSubscriptionChangeReasonByPlanRelation
} from '@/lib/payments/subscription-policy';
import {
  buildPayPalCheckoutTargetCustomId,
  capturePayPalOneTimeOrder,
  confirmPayPalSubscriptionForTeam,
  getPayPalOneTimeOrder,
  getPayPalCurrency,
  isPayPalConfigured
} from '@/lib/payments/paypal';
import { mapSubscriptionStatusToOrderStatus } from '@/lib/payments/orders';
import {
  CHECKOUT_SYSTEM_EVENTS,
  createCheckoutTemplateSnapshot,
  recordPayPalCheckoutEvent,
  recordStripeCheckoutEvent
} from '@/lib/payments/checkout-system';
import {
  getCheckoutOrderByProviderSession,
  getCheckoutOrderByToken,
  getCheckoutOrderByTokenForUser,
  isCheckoutOrderSignupIntent,
  isCheckoutOrderPayable,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed,
  markCheckoutOrderProviderPending,
  resolveCheckoutOrderEffectiveTargetType,
  type CheckoutOrderWithMetadata
} from '@/lib/payments/checkout-orders';
import { getStripeClient } from '@/lib/payments/stripe';
import {
  finalizeSignupIntentCheckout,
  getSignupIntentCheckoutAccessByToken
} from '@/lib/payments/signup-intents';
import type { ModulePaymentMethodActionResult } from './payment-methods';

type CoreCheckoutActionSuccess = {
  ok: true;
  result: ModulePaymentMethodActionResult;
  checkoutOrder: CheckoutOrderWithMetadata | null;
};

type CoreCheckoutActionFailure = {
  ok: false;
  statusCode: number;
  error: string;
  redirectUrl?: string | null;
};

export type CoreCheckoutActionResult =
  | CoreCheckoutActionSuccess
  | CoreCheckoutActionFailure;

function toIsoDateFromUnix(seconds: number | null | undefined) {
  if (!seconds || !Number.isFinite(seconds)) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function normalizeChangeMode(value: unknown) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

async function refreshCheckoutOrderByToken(checkoutToken: string | null | undefined) {
  if (!checkoutToken) {
    return null;
  }

  return getCheckoutOrderByToken(checkoutToken);
}

function buildCheckoutReturnRedirectUrl(
  checkoutOrder: CheckoutOrderWithMetadata | null,
  fallback = '/dashboard'
) {
  if (checkoutOrder?.orderType === 'one_time' && checkoutOrder.checkoutToken) {
    return `/checkout/${encodeURIComponent(checkoutOrder.checkoutToken)}`;
  }

  return fallback;
}

async function finalizeSignupIntentReturnSession({
  checkoutOrder,
  paymentProvider,
  providerReferenceId,
  providerPlanId = null,
  paymentMethod = null,
  planName = null,
  subscriptionStatus = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  trialEndsAt = null,
  cancelAtPeriodEnd = null,
  canceledAt = null,
  source
}: {
  checkoutOrder: CheckoutOrderWithMetadata | null;
  paymentProvider: 'stripe' | 'paypal';
  providerReferenceId: string | null;
  providerPlanId?: string | null;
  paymentMethod?: string | null;
  planName?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: string | null;
  source: string;
}) {
  if (!checkoutOrder || !isCheckoutOrderSignupIntent(checkoutOrder)) {
    return null;
  }

  const finalized = await finalizeSignupIntentCheckout({
    checkoutOrder,
    paymentProvider,
    providerReferenceId,
    providerPlanId,
    paymentMethod,
    planName,
    subscriptionStatus,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt,
    cancelAtPeriodEnd,
    canceledAt,
    source
  });

  if (finalized?.createdUser) {
    await setSession(finalized.createdUser, {
      metadata: {
        authArea: 'dashboard'
      }
    });
  }

  return finalized;
}

export function canReuseCompletedPayPalOneTimeCheckoutReturn({
  checkoutOrder,
  orderId
}: {
  checkoutOrder: CheckoutOrderWithMetadata | null;
  orderId: string | null;
}) {
  return canReuseCompletedOneTimeCheckoutReturn({
    checkoutOrder,
    providerSessionId: orderId,
    providerReferenceId: orderId
  });
}

export function canReuseCompletedOneTimeCheckoutReturn({
  checkoutOrder,
  providerSessionId = null,
  providerReferenceId = null
}: {
  checkoutOrder: CheckoutOrderWithMetadata | null;
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
}) {
  if (
    !checkoutOrder ||
    checkoutOrder.orderType !== 'one_time' ||
    checkoutOrder.status !== 'completed'
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

export function canReuseCompletedSubscriptionCheckoutReturn({
  checkoutOrder,
  provider,
  providerSessionId = null,
  providerReferenceId = null
}: {
  checkoutOrder: CheckoutOrderWithMetadata | null;
  provider: 'stripe' | 'paypal';
  providerSessionId?: string | null;
  providerReferenceId?: string | null;
}) {
  if (
    !checkoutOrder ||
    checkoutOrder.orderType !== 'subscription' ||
    checkoutOrder.status !== 'completed'
  ) {
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

async function handleStripeOneTimeCheckoutReturn({
  session,
  checkoutOrder,
  checkoutToken,
  checkoutOrderId
}: {
  session: Stripe.Checkout.Session;
  checkoutOrder: CheckoutOrderWithMetadata | null;
  checkoutToken: string | null;
  checkoutOrderId: number | null;
}): Promise<CoreCheckoutActionSuccess> {
  if (!checkoutOrder || checkoutOrder.orderType !== 'one_time') {
    throw new Error('Checkout order not found for Stripe one-time checkout.');
  }

  const resolvedTargetType =
    checkoutOrder.targetType === 'user' ? 'user' : 'team';
  const resolvedTargetTeamId =
    resolvedTargetType === 'team'
      ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
      : null;
  const resolvedTargetUserId =
    resolvedTargetType === 'user' ? checkoutOrder.targetUserId ?? null : null;
  if (resolvedTargetType === 'team' && !resolvedTargetTeamId) {
    throw new Error('Team target not found for Stripe one-time checkout.');
  }
  if (resolvedTargetType === 'user' && !resolvedTargetUserId) {
    throw new Error('User target not found for Stripe one-time checkout.');
  }

  if (
    session.payment_status !== 'paid' &&
    session.payment_status !== 'no_payment_required'
  ) {
    throw new Error('Stripe one-time checkout is not paid.');
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  if (
    canReuseCompletedOneTimeCheckoutReturn({
      checkoutOrder,
      providerSessionId: session.id,
      providerReferenceId: paymentIntentId ?? session.id
    })
  ) {
    return {
      ok: true,
      result: {
        status: 'completed',
        checkoutToken: checkoutOrder.checkoutToken,
        checkoutOrderId: checkoutOrder.id,
        redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder),
        providerSessionId: checkoutOrder.providerSessionId ?? session.id,
        providerReferenceId:
          checkoutOrder.providerReferenceId ??
          paymentIntentId ??
          session.id,
        externalOrderId: checkoutOrder.providerSessionId ?? session.id,
        externalPaymentId:
          checkoutOrder.providerReferenceId ?? paymentIntentId ?? null,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        amount: session.amount_total ?? checkoutOrder.amount ?? null,
        currency: session.currency ?? checkoutOrder.currency ?? null,
        message: 'Stripe one-time payment already confirmed.',
        eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
        metadata: {
          alreadyCompleted: true,
          checkoutToken: checkoutOrder.checkoutToken,
          paymentIntentId,
          paymentStatus: session.payment_status
        }
      },
      checkoutOrder
    };
  }

  await recordStripeCheckoutEvent({
    orderType: 'one_time',
    status: 'received',
    logStatus: 'success',
    eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
    source: 'checkout',
    teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
    targetType: resolvedTargetType,
    targetTeamId: resolvedTargetTeamId,
    targetUserId: resolvedTargetUserId,
    paymentMethod: session.payment_method_types?.[0] || 'card',
    planName: checkoutOrder.planName || 'One-time payment',
    externalOrderId: session.id,
    externalPaymentId: paymentIntentId ?? session.id,
    amount: session.amount_total ?? checkoutOrder.amount ?? null,
    currency: session.currency ?? checkoutOrder.currency ?? null,
    message: 'Stripe one-time checkout session completed.',
    metadata: {
      checkoutOrderId: checkoutOrderId ?? null,
      checkoutToken: checkoutToken ?? null,
      paymentStatus: session.payment_status
    },
    providerMetadata: {
      sessionId: session.id,
      customerId,
      paymentIntentId
    }
  });
  await markCheckoutOrderCompleted({
    checkoutOrderId: checkoutOrder.id,
    provider: 'stripe',
    providerReferenceId: paymentIntentId ?? session.id
  });

  const refreshedCheckoutOrder =
    (await refreshCheckoutOrderByToken(checkoutOrder.checkoutToken)) ?? checkoutOrder;

  return {
    ok: true,
    result: {
      status: 'completed',
      checkoutToken: refreshedCheckoutOrder.checkoutToken,
      checkoutOrderId: refreshedCheckoutOrder.id,
      redirectUrl: buildCheckoutReturnRedirectUrl(refreshedCheckoutOrder),
      providerSessionId: session.id,
      providerReferenceId: paymentIntentId ?? session.id,
      externalOrderId: session.id,
      externalPaymentId: paymentIntentId ?? session.id,
      paymentMethod: session.payment_method_types?.[0] || 'card',
      amount: session.amount_total ?? checkoutOrder.amount ?? null,
      currency: session.currency ?? checkoutOrder.currency ?? null,
      message: 'Stripe one-time checkout session completed.',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      metadata: {
        checkoutToken: refreshedCheckoutOrder.checkoutToken,
        paymentIntentId,
        paymentStatus: session.payment_status
      }
    },
    checkoutOrder: refreshedCheckoutOrder
  };
}

async function handlePayPalOneTimeCheckoutReturn({
  orderId,
  checkoutOrder,
  checkoutToken
}: {
  orderId: string;
  checkoutOrder: CheckoutOrderWithMetadata | null;
  checkoutToken: string | null;
}): Promise<CoreCheckoutActionSuccess> {
  if (!checkoutOrder || checkoutOrder.orderType !== 'one_time') {
    throw new Error('Checkout order is not a one-time payment.');
  }

  const resolvedTargetType =
    checkoutOrder.targetType === 'user' ? 'user' : 'team';
  const resolvedTargetTeamId =
    resolvedTargetType === 'team'
      ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
      : null;
  const resolvedTargetUserId =
    resolvedTargetType === 'user' ? checkoutOrder.targetUserId ?? null : null;
  if (resolvedTargetType === 'team' && !resolvedTargetTeamId) {
    throw new Error('Team target not found for PayPal one-time checkout.');
  }
  if (resolvedTargetType === 'user' && !resolvedTargetUserId) {
    throw new Error('User target not found for PayPal one-time checkout.');
  }

  const resolveFinalOrderState = async () => {
    const currentOrder = await getPayPalOneTimeOrder(orderId);
    if (
      currentOrder.effectiveStatus === 'COMPLETED' ||
      currentOrder.effectiveStatus === 'PENDING'
    ) {
      return {
        orderId: currentOrder.orderId,
        captureId: currentOrder.captureId,
        status: currentOrder.effectiveStatus,
        amount: currentOrder.amount,
        currency: currentOrder.currency,
        payerId: currentOrder.payerId,
        customId: currentOrder.customId
      };
    }

    if (currentOrder.orderStatus !== 'APPROVED') {
      throw new Error('PayPal one-time order is not approved for capture.');
    }

    try {
      return await capturePayPalOneTimeOrder(orderId);
    } catch (captureError) {
      const refreshedOrder = await getPayPalOneTimeOrder(orderId).catch(() => null);
      if (
        refreshedOrder?.effectiveStatus === 'COMPLETED' ||
        refreshedOrder?.effectiveStatus === 'PENDING' ||
        refreshedOrder?.effectiveStatus === 'APPROVED'
      ) {
        return {
          orderId: refreshedOrder.orderId,
          captureId: refreshedOrder.captureId,
          status: refreshedOrder.effectiveStatus,
          amount: refreshedOrder.amount,
          currency: refreshedOrder.currency,
          payerId: refreshedOrder.payerId,
          customId: refreshedOrder.customId
        };
      }

      throw captureError;
    }
  };

  const capture = await resolveFinalOrderState();
  const expectedCustomId = buildPayPalCheckoutTargetCustomId({
    targetType: resolvedTargetType,
    targetTeamId: resolvedTargetTeamId,
    targetUserId: resolvedTargetUserId
  });
  if (expectedCustomId && capture.customId !== expectedCustomId) {
    throw new Error('PayPal one-time order target mismatch.');
  }

  const expectedAmount = checkoutOrder.amount ?? null;
  const expectedCurrency = checkoutOrder.currency?.toUpperCase() ?? null;
  if (
    expectedAmount !== null &&
    capture.amount !== null &&
    capture.amount !== expectedAmount
  ) {
    throw new Error('PayPal one-time order amount mismatch.');
  }
  if (
    expectedCurrency &&
    capture.currency &&
    capture.currency.toUpperCase() !== expectedCurrency
  ) {
    throw new Error('PayPal one-time order currency mismatch.');
  }

  const normalizedCaptureStatus = capture.status?.toUpperCase() ?? null;
  if (
    normalizedCaptureStatus === 'PENDING' ||
    normalizedCaptureStatus === 'APPROVED'
  ) {
    await recordPayPalCheckoutEvent({
      orderType: 'one_time',
      status: 'pending',
      logStatus: 'info',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
      targetType: resolvedTargetType,
      targetTeamId: resolvedTargetTeamId,
      targetUserId: resolvedTargetUserId,
      paymentMethod: 'paypal',
      planName: checkoutOrder.planName || 'One-time payment',
      externalOrderId: capture.orderId,
      externalPaymentId: capture.captureId ?? null,
      amount: capture.amount ?? checkoutOrder.amount ?? null,
      currency: capture.currency ?? checkoutOrder.currency ?? null,
      message:
        normalizedCaptureStatus === 'PENDING'
          ? 'PayPal one-time payment is pending confirmation.'
          : 'PayPal one-time order is approved and awaiting capture confirmation.',
      metadata: {
        checkoutOrderId: checkoutOrder.id,
        checkoutToken: checkoutToken ?? checkoutOrder.checkoutToken,
        payerId: capture.payerId,
        providerStatus: normalizedCaptureStatus
      },
      providerMetadata: {
        orderId: capture.orderId,
        payerId: capture.payerId
      }
    });
    await markCheckoutOrderProviderPending({
      checkoutOrderId: checkoutOrder.id,
      provider: 'paypal',
      paymentMethod: 'paypal',
      providerSessionId: capture.orderId
    });

    const refreshedCheckoutOrder =
      (await refreshCheckoutOrderByToken(checkoutOrder.checkoutToken)) ?? checkoutOrder;

    return {
      ok: true,
      result: {
        status: 'provider_pending',
        checkoutToken: refreshedCheckoutOrder.checkoutToken,
        checkoutOrderId: refreshedCheckoutOrder.id,
        redirectUrl: buildCheckoutReturnRedirectUrl(refreshedCheckoutOrder),
        providerSessionId: capture.orderId,
        providerReferenceId: capture.captureId ?? null,
        externalOrderId: capture.orderId,
        externalPaymentId: capture.captureId ?? null,
        paymentMethod: 'paypal',
        amount: capture.amount ?? checkoutOrder.amount ?? null,
        currency: capture.currency ?? checkoutOrder.currency ?? null,
        message:
          normalizedCaptureStatus === 'PENDING'
            ? 'PayPal one-time payment is pending confirmation.'
            : 'PayPal one-time order is approved and awaiting capture confirmation.',
        eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
        metadata: {
          checkoutToken: refreshedCheckoutOrder.checkoutToken,
          payerId: capture.payerId,
          providerStatus: normalizedCaptureStatus
        }
      },
      checkoutOrder: refreshedCheckoutOrder
    };
  }

  if (normalizedCaptureStatus !== 'COMPLETED') {
    throw new Error('PayPal one-time order was not completed.');
  }

  await recordPayPalCheckoutEvent({
    orderType: 'one_time',
    status: 'received',
    logStatus: 'success',
    eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
    source: 'checkout',
    teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
    targetType: resolvedTargetType,
    targetTeamId: resolvedTargetTeamId,
    targetUserId: resolvedTargetUserId,
    paymentMethod: 'paypal',
    planName: checkoutOrder.planName || 'One-time payment',
    externalOrderId: capture.orderId,
    externalPaymentId: capture.captureId ?? capture.orderId,
    amount: capture.amount ?? checkoutOrder.amount ?? null,
    currency: capture.currency ?? checkoutOrder.currency ?? null,
    message: 'PayPal one-time payment captured.',
    metadata: {
      checkoutOrderId: checkoutOrder.id,
      checkoutToken: checkoutToken ?? checkoutOrder.checkoutToken,
      payerId: capture.payerId
    },
    providerMetadata: {
      orderId: capture.orderId,
      payerId: capture.payerId
    }
  });
  await markCheckoutOrderCompleted({
    checkoutOrderId: checkoutOrder.id,
    provider: 'paypal',
    providerReferenceId: capture.captureId ?? capture.orderId
  });

  const refreshedCheckoutOrder =
    (await refreshCheckoutOrderByToken(checkoutOrder.checkoutToken)) ?? checkoutOrder;

  return {
    ok: true,
    result: {
      status: 'completed',
      checkoutToken: refreshedCheckoutOrder.checkoutToken,
      checkoutOrderId: refreshedCheckoutOrder.id,
      redirectUrl: buildCheckoutReturnRedirectUrl(refreshedCheckoutOrder),
      providerSessionId: capture.orderId,
      providerReferenceId: capture.captureId ?? capture.orderId,
      externalOrderId: capture.orderId,
      externalPaymentId: capture.captureId ?? capture.orderId,
      paymentMethod: 'paypal',
      amount: capture.amount ?? checkoutOrder.amount ?? null,
      currency: capture.currency ?? checkoutOrder.currency ?? null,
      message: 'PayPal one-time payment captured.',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      metadata: {
        checkoutToken: refreshedCheckoutOrder.checkoutToken,
        payerId: capture.payerId
      }
    },
    checkoutOrder: refreshedCheckoutOrder
  };
}

export async function executeStripeCheckoutReturnAction({
  request,
  fallbackCheckoutToken = null,
  source = '/api/checkout/methods/stripe/return'
}: {
  request: Request;
  fallbackCheckoutToken?: string | null;
  source?: string;
}): Promise<CoreCheckoutActionResult> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      statusCode: 503,
      error: 'Stripe is not configured.',
      redirectUrl: '/pricing'
    };
  }

  const searchParams = new URL(request.url).searchParams;
  const sessionId = searchParams.get('session_id')?.trim() || null;
  const checkoutTokenFromQuery =
    searchParams.get('checkout_token')?.trim() || null;

  if (!sessionId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'session_id is required.',
      redirectUrl: '/pricing'
    };
  }

  let checkoutOrderId: number | null = null;
  let checkoutOrder: CheckoutOrderWithMetadata | null = null;
  let resolvedReturnOrderType: 'subscription' | 'one_time' = 'subscription';

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription']
    });
    const checkoutToken =
      checkoutTokenFromQuery ||
      fallbackCheckoutToken ||
      session.metadata?.checkout_token ||
      null;
    checkoutOrder =
      (await getCheckoutOrderByProviderSession({
        provider: 'stripe',
        providerSessionId: sessionId
      })) ||
      (checkoutToken ? await getCheckoutOrderByToken(checkoutToken) : null);
    checkoutOrderId = checkoutOrder?.id ?? null;

    resolvedReturnOrderType =
      checkoutOrder?.orderType === 'one_time' ||
      session.mode === 'payment' ||
      session.metadata?.checkout_order_type === 'one_time'
        ? 'one_time'
        : 'subscription';

    if (resolvedReturnOrderType === 'one_time') {
      return handleStripeOneTimeCheckoutReturn({
        session,
        checkoutOrder,
        checkoutToken,
        checkoutOrderId
      });
    }

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const isSignupIntentCheckout = isCheckoutOrderSignupIntent(checkoutOrder);
    const reusedCompletedSubscriptionCheckout =
      canReuseCompletedSubscriptionCheckoutReturn({
        checkoutOrder,
        provider: 'stripe',
        providerSessionId: sessionId,
        providerReferenceId: subscriptionId ?? sessionId
      });

    if (reusedCompletedSubscriptionCheckout && !isSignupIntentCheckout) {
      return {
        ok: true,
        result: {
          status: 'completed',
          checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken,
          checkoutOrderId: checkoutOrder?.id ?? checkoutOrderId,
          redirectUrl: '/dashboard',
          providerSessionId: checkoutOrder?.providerSessionId ?? sessionId,
          providerReferenceId:
            checkoutOrder?.providerReferenceId ??
            subscriptionId ??
            sessionId,
          externalOrderId: checkoutOrder?.providerSessionId ?? sessionId,
          externalPaymentId:
            checkoutOrder?.providerReferenceId ?? subscriptionId ?? null,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          amount: checkoutOrder?.amount ?? session.amount_total ?? null,
          currency: checkoutOrder?.currency ?? session.currency ?? null,
          message: 'Stripe subscription already confirmed.',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          metadata: {
            alreadyCompleted: true,
            checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken
          }
        },
        checkoutOrder
      };
    }

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });

    const subscriptionItem = subscription.items.data[0];
    const plan = subscriptionItem?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const stripeProduct = plan.product;
    const productId =
      typeof stripeProduct === 'string' ? stripeProduct : stripeProduct.id;
    const productName =
      typeof stripeProduct !== 'string' && 'name' in stripeProduct
        ? stripeProduct.name
        : null;
    const providerPlanId = plan.id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const templateIdFromSession = Number(
      checkoutOrder?.subscriptionTemplateId ||
        session.metadata?.subscription_template_id ||
        subscription.metadata?.subscription_template_id ||
        ''
    );
    const template =
      Number.isInteger(templateIdFromSession) && templateIdFromSession > 0
        ? await getSubscriptionTemplateById(templateIdFromSession)
        : null;
    const templateSnapshot = template
      ? createCheckoutTemplateSnapshot(template)
      : null;
    const currentPeriodStart = toIsoDateFromUnix(
      subscriptionItem?.current_period_start
    );
    const currentPeriodEnd = toIsoDateFromUnix(
      subscriptionItem?.current_period_end
    );
    const trialEndsAt = toIsoDateFromUnix(subscription.trial_end ?? null);
    const canceledAt = toIsoDateFromUnix(subscription.canceled_at ?? null);

    if (isSignupIntentCheckout) {
      if (checkoutOrderId && !reusedCompletedSubscriptionCheckout) {
        await markCheckoutOrderCompleted({
          checkoutOrderId,
          provider: 'stripe',
          providerReferenceId: subscriptionId
        });
      }

      const refreshedCompletedCheckoutOrder =
        (await refreshCheckoutOrderByToken(checkoutOrder?.checkoutToken)) ??
        checkoutOrder;
      const finalizedSignup = await finalizeSignupIntentReturnSession({
        checkoutOrder: refreshedCompletedCheckoutOrder,
        paymentProvider: 'stripe',
        providerReferenceId: subscriptionId,
        providerPlanId,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        planName: template?.name || productName || 'Stripe plan',
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
        signupTargetType === 'user' ? finalizedSignup?.createdUser?.id ?? null : null;

      if (!reusedCompletedSubscriptionCheckout) {
        await recordStripeCheckoutEvent({
          orderType: 'subscription',
          status: mapSubscriptionStatusToOrderStatus(subscription.status),
          logStatus: 'success',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          source: 'checkout',
          teamId: signupTargetTeamId,
          targetType: signupTargetType,
          targetTeamId: signupTargetTeamId,
          targetUserId: signupTargetUserId,
          subscriptionTemplateId: template?.id || null,
          templateSnapshot,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          planName: template?.name || productName || 'Stripe plan',
          providerPlanId,
          externalOrderId: sessionId,
          externalPaymentId: subscriptionId,
          amount: plan.unit_amount,
          currency: plan.currency,
          message: 'Stripe signup checkout session completed.',
          metadata: {
            templateId: template?.id || null,
            checkoutOrderId: checkoutOrderId ?? null,
            checkoutToken: checkoutToken ?? null,
            signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
          },
          providerMetadata: {
            sessionId,
            customerId,
            productId,
            subscriptionId,
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
            canceledAt
          }
        });
      }

      const finalizedCheckoutOrder =
        (await refreshCheckoutOrderByToken(
          refreshedCompletedCheckoutOrder?.checkoutToken
        )) ?? refreshedCompletedCheckoutOrder;

      return {
        ok: true,
        result: {
          status: 'completed',
          checkoutToken: finalizedCheckoutOrder?.checkoutToken ?? checkoutToken,
          checkoutOrderId: finalizedCheckoutOrder?.id ?? checkoutOrderId,
          redirectUrl: '/dashboard',
          providerSessionId: sessionId,
          providerReferenceId: subscriptionId,
          externalOrderId: sessionId,
          externalPaymentId: subscriptionId,
          providerPlanId,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          amount: plan.unit_amount,
          currency: plan.currency,
          message: reusedCompletedSubscriptionCheckout
            ? 'Stripe signup subscription already confirmed.'
            : 'Stripe signup checkout session completed.',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          metadata: {
            subscriptionId,
            customerId,
            checkoutToken: finalizedCheckoutOrder?.checkoutToken ?? checkoutToken,
            signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
          }
        },
        checkoutOrder: finalizedCheckoutOrder
      };
    }

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    const resolvedTargetType =
      resolveCheckoutOrderEffectiveTargetType(checkoutOrder) ?? 'team';
    const userTeam = await db
      .select({
        teamId: teamMembers.teamId
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user[0].id))
      .limit(1);
    const resolvedTargetTeamId =
      resolvedTargetType === 'team'
        ? checkoutOrder?.targetTeamId ?? checkoutOrder?.teamId ?? userTeam[0]?.teamId ?? null
        : null;
    const resolvedTargetUserId =
      resolvedTargetType === 'user'
        ? checkoutOrder?.targetUserId ?? user[0].id
        : null;

    if (resolvedTargetType === 'team' && !resolvedTargetTeamId) {
      throw new Error('Team target not found for Stripe checkout.');
    }

    if (resolvedTargetType === 'team') {
      const teamTargetId = resolvedTargetTeamId!;
      await db
        .update(teams)
        .set({
          stripeCustomerId: customerId,
          stripeProductId: productId,
          updatedAt: new Date()
        })
        .where(eq(teams.id, teamTargetId));
    }

    const changeMode = normalizeChangeMode(
      session.metadata?.checkout_change_mode ||
        subscription.metadata?.checkout_change_mode
    );
    const activeAssignment =
      resolvedTargetType === 'team'
        ? await getActiveTeamSubscriptionAssignment(resolvedTargetTeamId!)
        : await getActiveUserSubscriptionAssignment(resolvedTargetUserId!);
    let planRelation = normalizeSubscriptionPlanRelation(
      checkoutOrder?.parsedMetadata?.subscription?.planRelation
    );
    if (!planRelation && activeAssignment?.subscriptionTemplateId && template) {
      if (activeAssignment.subscriptionTemplateId === template.id) {
        planRelation = 'same_template';
      } else {
        const currentTemplate = await getSubscriptionTemplateById(
          activeAssignment.subscriptionTemplateId
        );
        planRelation = classifySubscriptionPlanRelation({
          currentTemplate,
          nextTemplate: template
        });
      }
    }
    const shouldScheduleChange =
      changeMode === 'period_end' &&
      activeAssignment &&
      template?.id &&
      planRelation !== 'same_template';
    const changeRequest = shouldScheduleChange
      ? await createSubscriptionChangeRequest({
          targetType: resolvedTargetType,
          targetId:
            resolvedTargetType === 'team'
              ? resolvedTargetTeamId!
              : resolvedTargetUserId!,
          currentAssignmentId: activeAssignment?.id ?? null,
          currentTemplateId: activeAssignment?.subscriptionTemplateId ?? null,
          requestedTemplateId: template?.id ?? 0,
          requestedProvider: 'stripe',
          requestedPaymentMethod: session.payment_method_types?.[0] || 'card',
          requestedProviderPlanId: providerPlanId,
          requestedPlanName: template?.name || productName || 'Stripe plan',
          changeReason: resolveSubscriptionChangeReasonByPlanRelation(planRelation),
          changeMode: 'period_end',
          currentPeriodEnd: activeAssignment?.currentPeriodEnd ?? null,
          trialEndsAt: activeAssignment?.trialEndsAt ?? null
        })
      : null;
    const subscriptionChange = changeRequest
      ? {
          mode: 'period_end' as const,
          requestId: changeRequest.id,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        }
      : null;

    if (changeRequest) {
      await emitEventAsync(
        EVENT_HOOKS.checkoutChangeRequestCreated,
        {
          changeRequestId: changeRequest.id,
          provider: 'stripe',
          teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
          targetUserId:
            resolvedTargetType === 'user' ? resolvedTargetUserId : null,
          templateId: template?.id ?? null,
          changeMode,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        },
        {
          actorUserId: user[0].id,
          actorEmail: user[0].email,
          actorRole: user[0].role,
          teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
          targetUserId:
            resolvedTargetType === 'user' ? resolvedTargetUserId : null,
          source
        }
      );
    }

    await recordStripeCheckoutEvent({
      orderType: 'subscription',
      status: mapSubscriptionStatusToOrderStatus(subscription.status),
      logStatus: 'success',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: resolvedTargetType === 'team' ? resolvedTargetTeamId : null,
      targetType: resolvedTargetType,
      targetTeamId: resolvedTargetTeamId,
      targetUserId: resolvedTargetUserId,
      subscriptionTemplateId: template?.id || null,
      templateSnapshot,
      paymentMethod: session.payment_method_types?.[0] || 'card',
      planName: template?.name || productName || 'Stripe plan',
      providerPlanId,
      externalOrderId: sessionId,
      externalPaymentId: subscriptionId,
      amount: plan.unit_amount,
      currency: plan.currency,
      message: 'Stripe checkout session completed.',
      metadata: {
        templateId: template?.id || null,
        checkoutOrderId: checkoutOrderId ?? null,
        checkoutToken: checkoutToken ?? null,
        checkoutOrderSubscription: checkoutOrder?.parsedMetadata?.subscription ?? null,
        planRelation,
        subscriptionChange
      },
      providerMetadata: {
        sessionId,
        customerId,
        productId,
        subscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? null,
        canceledAt
      }
    });
    if (checkoutOrderId) {
      await markCheckoutOrderCompleted({
        checkoutOrderId,
        provider: 'stripe',
        providerReferenceId: subscriptionId
      });
    }

    await setSession(user[0]);
    const refreshedCheckoutOrder =
      (await refreshCheckoutOrderByToken(checkoutOrder?.checkoutToken)) ?? checkoutOrder;

    return {
      ok: true,
      result: {
        status: 'completed',
        checkoutToken: refreshedCheckoutOrder?.checkoutToken ?? checkoutToken,
        checkoutOrderId: refreshedCheckoutOrder?.id ?? checkoutOrderId,
        redirectUrl: '/dashboard',
        providerSessionId: sessionId,
        providerReferenceId: subscriptionId,
        externalOrderId: sessionId,
        externalPaymentId: subscriptionId,
        providerPlanId,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        amount: plan.unit_amount,
        currency: plan.currency,
        message: 'Stripe checkout session completed.',
        eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
        metadata: {
          subscriptionId,
          customerId,
          checkoutToken: refreshedCheckoutOrder?.checkoutToken ?? checkoutToken
        }
      },
      checkoutOrder: refreshedCheckoutOrder
    };
  } catch (error) {
    await recordStripeCheckoutEvent({
      orderType: resolvedReturnOrderType,
      status: 'failed',
      logStatus: 'failed',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId:
        resolvedReturnOrderType === 'one_time' && checkoutOrder?.targetType === 'team'
          ? checkoutOrder.targetTeamId ?? checkoutOrder.teamId ?? null
          : null,
      targetType:
        resolvedReturnOrderType === 'one_time' &&
        (checkoutOrder?.targetType === 'team' || checkoutOrder?.targetType === 'user')
          ? checkoutOrder.targetType
          : null,
      targetTeamId:
        resolvedReturnOrderType === 'one_time'
          ? checkoutOrder?.targetTeamId ?? checkoutOrder?.teamId ?? null
          : null,
      targetUserId:
        resolvedReturnOrderType === 'one_time' ? checkoutOrder?.targetUserId ?? null : null,
      externalOrderId: sessionId,
      providerMetadata: {
        sessionId
      },
      message:
        resolvedReturnOrderType === 'one_time'
          ? 'Error handling successful Stripe one-time checkout.'
          : 'Error handling successful Stripe checkout.'
    });
    if (!checkoutOrderId) {
      const resolvedCheckoutOrder = await getCheckoutOrderByProviderSession({
        provider: 'stripe',
        providerSessionId: sessionId
      });
      checkoutOrder = resolvedCheckoutOrder ?? null;
      checkoutOrderId = resolvedCheckoutOrder?.id ?? null;
    }
    if (checkoutOrderId) {
      await markCheckoutOrderFailed({
        checkoutOrderId,
        provider: 'stripe',
        providerReferenceId: sessionId
      });
    }
    console.error('Error handling successful checkout:', error);
    return {
      ok: false,
      statusCode: 500,
      error:
        resolvedReturnOrderType === 'one_time'
          ? 'Error handling successful Stripe one-time checkout.'
          : 'Error handling successful Stripe checkout.',
      redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder, '/error')
    };
  }
}

type CheckoutRequestBody = {
  subscriptionId?: unknown;
  orderId?: unknown;
  templateId?: unknown;
  checkoutToken?: unknown;
  changeMode?: unknown;
};

export async function executePayPalCheckoutReturnAction({
  request,
  fallbackCheckoutToken = null,
  source = '/api/checkout/methods/paypal/return'
}: {
  request: Request;
  fallbackCheckoutToken?: string | null;
  source?: string;
}): Promise<CoreCheckoutActionResult> {
  if (!(await isPayPalConfigured())) {
    return {
      ok: false,
      statusCode: 503,
      error: 'PayPal is not configured.'
    };
  }

  const user = await getUser();
  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  const subscriptionId =
    typeof body.subscriptionId === 'string' && body.subscriptionId.trim()
      ? body.subscriptionId.trim()
      : null;
  const orderId =
    typeof body.orderId === 'string' && body.orderId.trim()
      ? body.orderId.trim()
      : null;

  const checkoutToken =
    typeof body.checkoutToken === 'string' && body.checkoutToken.trim()
      ? body.checkoutToken.trim()
      : fallbackCheckoutToken;
  const changeModeFromBody = normalizeChangeMode(body.changeMode);
  const checkoutAccess = checkoutToken && user
    ? await getCheckoutOrderByTokenForUser({
        checkoutToken,
        userId: user.id
      })
    : null;
  const signupIntentAccess =
    checkoutToken && !checkoutAccess
      ? await getSignupIntentCheckoutAccessByToken(checkoutToken)
      : null;
  const checkoutOrder =
    checkoutAccess?.checkoutOrder ?? signupIntentAccess?.checkoutOrder ?? null;
  const isSignupIntentCheckout = isCheckoutOrderSignupIntent(checkoutOrder);
  const returnedPayPalOrderMatchesCompletedCheckout =
    canReuseCompletedPayPalOneTimeCheckoutReturn({
      checkoutOrder,
      orderId
    });
  const returnedPayPalSubscriptionMatchesCompletedCheckout =
    canReuseCompletedSubscriptionCheckoutReturn({
      checkoutOrder,
      provider: 'paypal',
      providerSessionId: subscriptionId,
      providerReferenceId: subscriptionId
    });
  const isCompletedPayPalOneTimeCheckout =
    checkoutOrder?.orderType === 'one_time' && checkoutOrder.status === 'completed';
  const isCompletedPayPalSubscriptionCheckout =
    checkoutOrder?.orderType === 'subscription' &&
    checkoutOrder.status === 'completed';

  if (
    checkoutToken &&
    (!checkoutOrder ||
      (!isCheckoutOrderPayable(checkoutOrder) &&
        !returnedPayPalOrderMatchesCompletedCheckout &&
        !returnedPayPalSubscriptionMatchesCompletedCheckout))
  ) {
    if (!user && !signupIntentAccess) {
      return {
        ok: false,
        statusCode: 401,
        error: 'Authentication required.',
        redirectUrl: '/login?redirect=pricing'
      };
    }

    return {
      ok: false,
      statusCode: 404,
      error: 'Checkout order is not available.'
    };
  }
  if (
    checkoutOrder &&
    checkoutOrder.orderType !== 'subscription' &&
    checkoutOrder.orderType !== 'one_time'
  ) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Checkout order type is not supported.'
    };
  }

  const resolvedTargetType =
    resolveCheckoutOrderEffectiveTargetType(checkoutOrder) ?? 'team';
  const fallbackTeam =
    resolvedTargetType === 'team' &&
    !isSignupIntentCheckout &&
    !(checkoutOrder?.targetTeamId ?? checkoutOrder?.teamId)
      ? await getTeamForUser()
      : null;
  let team =
    resolvedTargetType === 'team'
      ? checkoutOrder?.targetTeamId ?? checkoutOrder?.teamId
        ? await getTeamById(checkoutOrder.targetTeamId ?? checkoutOrder.teamId!)
        : fallbackTeam
      : null;

  if (resolvedTargetType === 'team' && !isSignupIntentCheckout) {
    if (!team) {
      return {
        ok: false,
        statusCode: 404,
        error: 'Team not found.'
      };
    }

    if (checkoutAccess?.teamRole && checkoutAccess.teamRole !== 'owner') {
      return {
        ok: false,
        statusCode: 403,
        error: 'Only owners can start checkout.'
      };
    }

    if (!checkoutAccess?.teamRole) {
      const membership = fallbackTeam?.teamMembers.find(
        (member) => member.userId === user?.id
      );
      if (!membership || membership.role !== 'owner') {
        return {
          ok: false,
          statusCode: 403,
          error: 'Only owners can start checkout.'
        };
      }
    }
  }

  if (checkoutOrder?.orderType === 'one_time') {
    if (isCompletedPayPalOneTimeCheckout) {
      if (!returnedPayPalOrderMatchesCompletedCheckout) {
        return {
          ok: false,
          statusCode: 409,
          error: 'Returned PayPal order does not match the completed checkout order.',
          redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder, '/error')
        };
      }

      return {
        ok: true,
        result: {
          status: 'completed',
          checkoutToken: checkoutOrder.checkoutToken,
          checkoutOrderId: checkoutOrder.id,
          redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder),
          providerSessionId: checkoutOrder.providerSessionId ?? orderId,
          providerReferenceId:
            checkoutOrder.providerReferenceId ??
            checkoutOrder.providerSessionId ??
            orderId,
          externalOrderId: checkoutOrder.providerSessionId ?? orderId,
          externalPaymentId: checkoutOrder.providerReferenceId ?? null,
          paymentMethod: 'paypal',
          amount: checkoutOrder.amount ?? null,
          currency: checkoutOrder.currency ?? null,
          message: 'PayPal one-time payment already confirmed.',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          metadata: {
            alreadyCompleted: true,
            checkoutToken: checkoutOrder.checkoutToken
          }
        },
        checkoutOrder
      };
    }

    if (!orderId) {
      return {
        ok: false,
        statusCode: 400,
        error: 'orderId is required.'
      };
    }

    if (checkoutOrder) {
      await markCheckoutOrderProviderPending({
        checkoutOrderId: checkoutOrder.id,
        provider: 'paypal',
        paymentMethod: 'paypal',
        providerSessionId: orderId
      });
    }

    try {
      return await handlePayPalOneTimeCheckoutReturn({
        orderId,
        checkoutOrder,
        checkoutToken
      });
    } catch (error) {
      await recordPayPalCheckoutEvent({
        orderType: 'one_time',
        status: 'failed',
        logStatus: 'failed',
        eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
        source: 'checkout',
        teamId: resolvedTargetType === 'team' ? team?.id ?? null : null,
        targetType: resolvedTargetType,
        targetTeamId: resolvedTargetType === 'team' ? team?.id ?? null : null,
        targetUserId:
          resolvedTargetType === 'user'
            ? checkoutOrder?.targetUserId ?? user?.id ?? null
            : null,
        paymentMethod: 'paypal',
        planName: checkoutOrder.planName,
        externalOrderId: orderId,
        metadata: {
          checkoutOrderId: checkoutOrder?.id ?? null,
          checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken ?? null
        },
        providerMetadata: {
          orderId
        },
        message: 'Unable to capture PayPal one-time payment.'
      });
      if (checkoutOrder) {
        await markCheckoutOrderFailed({
          checkoutOrderId: checkoutOrder.id,
          provider: 'paypal',
          providerReferenceId: orderId
        });
      }
      console.error('Error confirming PayPal one-time payment:', error);
      return {
        ok: false,
        statusCode: 500,
        error: 'Unable to confirm PayPal one-time payment.',
        redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder, '/error')
      };
    }
  }

  if (isCompletedPayPalSubscriptionCheckout) {
    if (!returnedPayPalSubscriptionMatchesCompletedCheckout) {
      return {
        ok: false,
        statusCode: 409,
        error: 'Returned PayPal subscription does not match the completed checkout order.',
        redirectUrl: buildCheckoutReturnRedirectUrl(checkoutOrder, '/error')
      };
    }

    if (!isSignupIntentCheckout) {
      return {
        ok: true,
        result: {
          status: 'completed',
          checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken ?? null,
          checkoutOrderId: checkoutOrder?.id ?? null,
          redirectUrl: '/dashboard',
          providerSessionId: checkoutOrder?.providerSessionId ?? subscriptionId,
          providerReferenceId: checkoutOrder?.providerReferenceId ?? subscriptionId,
          externalPaymentId:
            checkoutOrder?.providerReferenceId ?? subscriptionId ?? null,
          paymentMethod: 'paypal',
          amount: checkoutOrder?.amount ?? null,
          currency: checkoutOrder?.currency ?? null,
          message: 'PayPal subscription already confirmed.',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          metadata: {
            alreadyCompleted: true,
            checkoutToken: checkoutOrder?.checkoutToken ?? checkoutToken ?? null
          }
        },
        checkoutOrder
      };
    }
  }

  const templateId = checkoutOrder?.subscriptionTemplateId ?? Number(body.templateId);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return {
      ok: false,
      statusCode: 400,
      error: 'templateId or checkoutToken is required.'
    };
  }

  const template = await getSubscriptionTemplateById(templateId);
  if (!template) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Invalid PayPal subscription template.'
    };
  }
  if (!subscriptionId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'subscriptionId is required.'
    };
  }
  const changeMode =
    changeModeFromBody ??
    normalizeChangeMode(checkoutOrder?.parsedMetadata?.subscription?.changeMode);
  if (checkoutOrder) {
    await markCheckoutOrderProviderPending({
      checkoutOrderId: checkoutOrder.id,
      provider: 'paypal',
      paymentMethod: 'paypal',
      providerSessionId: subscriptionId
    });
  }

  try {
    const templateSnapshot = createCheckoutTemplateSnapshot(template);
    const subscription = await confirmPayPalSubscriptionForTeam({
      teamId: team?.id ?? 0,
      subscriptionId,
      template
    });
    if (isSignupIntentCheckout) {
      if (checkoutOrder && !isCompletedPayPalSubscriptionCheckout) {
        await markCheckoutOrderCompleted({
          checkoutOrderId: checkoutOrder.id,
          provider: 'paypal',
          providerReferenceId: subscriptionId
        });
      }

      const refreshedCompletedCheckoutOrder =
        (await refreshCheckoutOrderByToken(checkoutOrder?.checkoutToken)) ?? checkoutOrder;
      const finalizedSignup = await finalizeSignupIntentReturnSession({
        checkoutOrder: refreshedCompletedCheckoutOrder,
        paymentProvider: 'paypal',
        providerReferenceId: subscriptionId,
        providerPlanId: subscription.planId,
        paymentMethod: 'paypal',
        planName: subscription.planName || template.name,
        subscriptionStatus: subscription.subscriptionStatus,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
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

      if (!isCompletedPayPalSubscriptionCheckout) {
        await recordPayPalCheckoutEvent({
          orderType: 'subscription',
          status: mapSubscriptionStatusToOrderStatus(subscription.subscriptionStatus),
          logStatus: 'success',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          source: 'checkout',
          teamId: signupTargetTeamId,
          targetType: signupTargetType,
          targetTeamId: signupTargetTeamId,
          targetUserId: signupTargetUserId,
          subscriptionTemplateId: template.id,
          templateSnapshot,
          paymentMethod: 'paypal',
          planName: subscription.planName || template.name,
          providerPlanId: subscription.planId,
          externalPaymentId: subscriptionId,
          amount: template.priceCents,
          currency: template.currency,
          message: 'PayPal signup subscription confirmed.',
          metadata: {
            planName: subscription.planName,
            templateId: template.id,
            checkoutOrderId: checkoutOrder?.id ?? null,
            checkoutToken: checkoutOrder?.checkoutToken ?? null,
            signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
          },
          providerMetadata: {
            subscriptionId,
            planId: subscription.planId,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd
          }
        });
      }

      const finalizedCheckoutOrder =
        (await refreshCheckoutOrderByToken(
          refreshedCompletedCheckoutOrder?.checkoutToken
        )) ?? refreshedCompletedCheckoutOrder;

      return {
        ok: true,
        result: {
          status: 'completed',
          checkoutToken: finalizedCheckoutOrder?.checkoutToken ?? checkoutToken ?? null,
          checkoutOrderId: finalizedCheckoutOrder?.id ?? checkoutOrder?.id ?? null,
          redirectUrl: '/dashboard',
          providerSessionId: subscriptionId,
          providerReferenceId: subscriptionId,
          externalPaymentId: subscriptionId,
          providerPlanId: subscription.planId,
          paymentMethod: 'paypal',
          amount: template.priceCents,
          currency: template.currency,
          message: isCompletedPayPalSubscriptionCheckout
            ? 'PayPal signup subscription already confirmed.'
            : 'PayPal signup subscription confirmed.',
          eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
          metadata: {
            subscription,
            payPalCurrency: await getPayPalCurrency(),
            signupIntentFinalized: Boolean(finalizedSignup?.createdUser)
          }
        },
        checkoutOrder: finalizedCheckoutOrder
      };
    }

    const activeAssignment =
      resolvedTargetType === 'team'
        ? await getActiveTeamSubscriptionAssignment(team!.id)
        : await getActiveUserSubscriptionAssignment(user!.id);
    let planRelation = normalizeSubscriptionPlanRelation(
      checkoutOrder?.parsedMetadata?.subscription?.planRelation
    );
    if (!planRelation && activeAssignment?.subscriptionTemplateId) {
      if (activeAssignment.subscriptionTemplateId === template.id) {
        planRelation = 'same_template';
      } else {
        const currentTemplate = await getSubscriptionTemplateById(
          activeAssignment.subscriptionTemplateId
        );
        planRelation = classifySubscriptionPlanRelation({
          currentTemplate,
          nextTemplate: template
        });
      }
    }
    const shouldScheduleChange =
      changeMode === 'period_end' &&
      activeAssignment &&
      planRelation !== 'same_template';
    const changeRequest = shouldScheduleChange
      ? await createSubscriptionChangeRequest({
          targetType: resolvedTargetType,
          targetId:
            resolvedTargetType === 'team'
              ? team!.id
              : checkoutOrder?.targetUserId ?? user!.id,
          currentAssignmentId: activeAssignment?.id ?? null,
          currentTemplateId: activeAssignment?.subscriptionTemplateId ?? null,
          requestedTemplateId: template.id,
          requestedProvider: 'paypal',
          requestedPaymentMethod: 'paypal',
          requestedProviderPlanId: subscription.planId,
          requestedPlanName: subscription.planName ?? template.name,
          changeReason: resolveSubscriptionChangeReasonByPlanRelation(planRelation),
          changeMode: 'period_end',
          currentPeriodEnd: activeAssignment?.currentPeriodEnd ?? null,
          trialEndsAt: activeAssignment?.trialEndsAt ?? null
        })
      : null;
    const subscriptionChange = changeRequest
      ? {
          mode: 'period_end' as const,
          requestId: changeRequest.id,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        }
      : null;

    if (changeRequest) {
      await emitEventAsync(
        EVENT_HOOKS.checkoutChangeRequestCreated,
        {
          changeRequestId: changeRequest.id,
          provider: 'paypal',
          teamId: resolvedTargetType === 'team' ? team!.id : null,
          targetUserId:
            resolvedTargetType === 'user'
              ? checkoutOrder?.targetUserId ?? user!.id
              : null,
          templateId: template.id,
          changeMode,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        },
        {
          actorUserId: user!.id,
          actorEmail: user!.email,
          actorRole: user!.role,
          teamId: resolvedTargetType === 'team' ? team!.id : null,
          targetUserId:
            resolvedTargetType === 'user'
              ? checkoutOrder?.targetUserId ?? user!.id
              : null,
          source
        }
      );
    }

    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: mapSubscriptionStatusToOrderStatus(subscription.subscriptionStatus),
      logStatus: 'success',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: resolvedTargetType === 'team' ? team!.id : null,
      targetType: resolvedTargetType,
      targetTeamId: resolvedTargetType === 'team' ? team!.id : null,
      targetUserId:
        resolvedTargetType === 'user' ? checkoutOrder?.targetUserId ?? user!.id : null,
      subscriptionTemplateId: template.id,
      templateSnapshot,
      paymentMethod: 'paypal',
      planName: subscription.planName || template.name,
      providerPlanId: subscription.planId,
      externalPaymentId: subscriptionId,
      amount: template.priceCents,
      currency: template.currency,
      message: 'PayPal subscription confirmed.',
      metadata: {
        planName: subscription.planName,
        templateId: template.id,
        checkoutOrderId: checkoutOrder?.id ?? null,
        checkoutToken: checkoutOrder?.checkoutToken ?? null,
        checkoutOrderSubscription: checkoutOrder?.parsedMetadata?.subscription ?? null,
        planRelation,
        subscriptionChange
      },
      providerMetadata: {
        subscriptionId,
        planId: subscription.planId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
    if (checkoutOrder) {
      await markCheckoutOrderCompleted({
        checkoutOrderId: checkoutOrder.id,
        provider: 'paypal',
        providerReferenceId: subscriptionId
      });
    }

    const refreshedCheckoutOrder =
      (await refreshCheckoutOrderByToken(checkoutOrder?.checkoutToken)) ?? checkoutOrder;

    return {
      ok: true,
      result: {
        status: 'completed',
        checkoutToken: refreshedCheckoutOrder?.checkoutToken ?? checkoutToken ?? null,
        checkoutOrderId: refreshedCheckoutOrder?.id ?? checkoutOrder?.id ?? null,
        redirectUrl: '/dashboard',
        providerSessionId: subscriptionId,
        providerReferenceId: subscriptionId,
        externalPaymentId: subscriptionId,
        providerPlanId: subscription.planId,
        paymentMethod: 'paypal',
        amount: template.priceCents,
        currency: template.currency,
        message: 'PayPal subscription confirmed.',
        eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
        metadata: {
          subscription,
          payPalCurrency: await getPayPalCurrency()
        }
      },
      checkoutOrder: refreshedCheckoutOrder
    };
  } catch (error) {
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: 'failed',
      logStatus: 'failed',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: resolvedTargetType === 'team' ? team?.id ?? null : null,
      targetType: resolvedTargetType,
      targetTeamId: resolvedTargetType === 'team' ? team?.id ?? null : null,
      targetUserId:
        resolvedTargetType === 'user' ? checkoutOrder?.targetUserId ?? user?.id ?? null : null,
      subscriptionTemplateId: template.id,
      templateSnapshot: createCheckoutTemplateSnapshot(template),
      paymentMethod: 'paypal',
      planName: template.name,
      providerPlanId: null,
      externalPaymentId: subscriptionId,
      providerMetadata: {
        subscriptionId
      },
      metadata: {
        checkoutOrderId: checkoutOrder?.id ?? null,
        checkoutToken: checkoutOrder?.checkoutToken ?? null,
        checkoutOrderSubscription: checkoutOrder?.parsedMetadata?.subscription ?? null
      },
      message: 'Unable to confirm PayPal subscription.'
    });
    if (checkoutOrder) {
      await markCheckoutOrderFailed({
        checkoutOrderId: checkoutOrder.id,
        provider: 'paypal',
        providerReferenceId: subscriptionId
      });
    }
    console.error('Error confirming PayPal subscription:', error);
    return {
      ok: false,
      statusCode: 500,
      error: 'Unable to confirm PayPal subscription.'
    };
  }
}
