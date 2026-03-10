import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/payments/stripe';
import {
  mapSubscriptionStatusToOrderStatus
} from '@/lib/payments/orders';
import {
  getActiveTeamSubscriptionAssignment,
  getSubscriptionTemplateById
} from '@/lib/db/queries';
import { createSubscriptionChangeRequest } from '@/lib/payments/subscription-change';
import {
  classifySubscriptionPlanRelation,
  normalizeSubscriptionPlanRelation,
  resolveSubscriptionChangeReasonByPlanRelation
} from '@/lib/payments/subscription-policy';
import {
  CHECKOUT_SYSTEM_EVENTS,
  createCheckoutTemplateSnapshot,
  recordStripeCheckoutEvent
} from '@/lib/payments/checkout-system';
import {
  getCheckoutOrderByProviderSession,
  getCheckoutOrderByToken,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed
} from '@/lib/payments/checkout-orders';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';
import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

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

async function handleStripeCheckout(request: Request): Promise<Response> {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/stripe/checkout',
    replacementPath: '/api/checkout/methods/stripe/return',
    provider: 'stripe',
    source: '/api/stripe/checkout'
  });

  const stripe = await getStripeClient();
  if (!stripe) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  const searchParams = new URL(request.url).searchParams;
  const sessionId = searchParams.get('session_id');
  const checkoutTokenFromQuery = searchParams.get('checkout_token');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  let checkoutOrderId: number | null = null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
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
    const checkoutToken =
      checkoutTokenFromQuery ||
      session.metadata?.checkout_token ||
      subscription.metadata?.checkout_token ||
      null;
    const checkoutOrderFromSession =
      (await getCheckoutOrderByProviderSession({
        provider: 'stripe',
        providerSessionId: sessionId
      })) ||
      (checkoutToken ? await getCheckoutOrderByToken(checkoutToken) : null);
    checkoutOrderId = checkoutOrderFromSession?.id ?? null;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const templateIdFromSession = Number(
      checkoutOrderFromSession?.subscriptionTemplateId ||
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

    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user[0].id))
      .limit(1);

    if (userTeam.length === 0) {
      throw new Error('User is not associated with any team.');
    }

    await db
      .update(teams)
      .set({
        stripeCustomerId: customerId,
        stripeProductId: productId,
        updatedAt: new Date()
      })
      .where(eq(teams.id, userTeam[0].teamId));

    const changeMode = normalizeChangeMode(
      session.metadata?.checkout_change_mode ||
        subscription.metadata?.checkout_change_mode
    );
    const activeAssignment = await getActiveTeamSubscriptionAssignment(
      userTeam[0].teamId
    );
    let planRelation = normalizeSubscriptionPlanRelation(
      checkoutOrderFromSession?.parsedMetadata?.subscription?.planRelation
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
          targetType: 'team',
          targetId: userTeam[0].teamId,
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
          teamId: userTeam[0].teamId,
          templateId: template?.id ?? null,
          changeMode,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        },
        {
          actorUserId: user[0].id,
          actorEmail: user[0].email,
          actorRole: user[0].role,
          teamId: userTeam[0].teamId,
          source: '/api/stripe/checkout'
        }
      );
    }

    await recordStripeCheckoutEvent({
      orderType: 'subscription',
      status: mapSubscriptionStatusToOrderStatus(subscription.status),
      logStatus: 'success',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: userTeam[0].teamId,
      targetType: 'team',
      targetTeamId: userTeam[0].teamId,
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
        checkoutOrderSubscription:
          checkoutOrderFromSession?.parsedMetadata?.subscription ?? null,
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
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    await recordStripeCheckoutEvent({
      orderType: 'subscription',
      status: 'failed',
      logStatus: 'failed',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      externalOrderId: sessionId,
      providerMetadata: {
        sessionId
      },
      message: 'Error handling successful Stripe checkout.'
    });
    if (!checkoutOrderId) {
      const checkoutOrder = await getCheckoutOrderByProviderSession({
        provider: 'stripe',
        providerSessionId: sessionId
      });
      checkoutOrderId = checkoutOrder?.id ?? null;
    }
    if (checkoutOrderId) {
      await markCheckoutOrderFailed({
        checkoutOrderId,
        provider: 'stripe',
        providerReferenceId: sessionId
      });
    }
    console.error('Error handling successful checkout:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

export const GET = withApiRouteEntries(
  CoreApiRoutes.stripe.checkout.handler(handleStripeCheckout)
);
