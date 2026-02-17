import {
  getActiveTeamSubscriptionAssignment,
  getSubscriptionTemplateById,
  getTeamForUser,
  getUser
} from '@/lib/db/queries';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { createSubscriptionChangeRequest } from '@/lib/payments/subscription-change';
import {
  classifySubscriptionPlanRelation,
  normalizeSubscriptionPlanRelation,
  resolveSubscriptionChangeReasonByPlanRelation
} from '@/lib/payments/subscription-policy';
import {
  confirmPayPalSubscriptionForTeam,
  isPayPalConfigured
} from '@/lib/payments/paypal';
import {
  mapSubscriptionStatusToOrderStatus
} from '@/lib/payments/orders';
import { NextRequest, NextResponse } from 'next/server';
import {
  CHECKOUT_SYSTEM_EVENTS,
  createCheckoutTemplateSnapshot,
  recordPayPalCheckoutEvent
} from '@/lib/payments/checkout-system';
import {
  getCheckoutOrderByTokenForTeam,
  isCheckoutOrderPayable,
  markCheckoutOrderProviderPending,
  markCheckoutOrderCompleted,
  markCheckoutOrderFailed
} from '@/lib/payments/checkout-orders';
import { logLegacyCheckoutRouteUsage } from '@/lib/payments/legacy-routes';

type CheckoutRequestBody = {
  subscriptionId?: unknown;
  templateId?: unknown;
  checkoutToken?: unknown;
  changeMode?: unknown;
};

function normalizeChangeMode(value: unknown) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

export async function POST(request: NextRequest) {
  await logLegacyCheckoutRouteUsage({
    request,
    routePath: '/api/paypal/checkout',
    replacementPath: '/api/checkout/methods/paypal/return',
    provider: 'paypal',
    source: '/api/paypal/checkout'
  });

  if (!(await isPayPalConfigured())) {
    return NextResponse.json(
      { error: 'PayPal is not configured.' },
      { status: 503 }
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.', redirectUrl: '/login?redirect=pricing' },
      { status: 401 }
    );
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  }
  const membership = team.teamMembers.find((member) => member.userId === user.id);
  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only owners can start checkout.' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  if (typeof body.subscriptionId !== 'string' || !body.subscriptionId) {
    return NextResponse.json(
      { error: 'subscriptionId is required.' },
      { status: 400 }
    );
  }

  const checkoutToken =
    typeof body.checkoutToken === 'string' ? body.checkoutToken.trim() : '';
  const changeModeFromBody = normalizeChangeMode(body.changeMode);
  const checkoutOrder = checkoutToken
    ? await getCheckoutOrderByTokenForTeam({
        checkoutToken,
        teamId: team.id
      })
    : null;

  if (checkoutToken && (!checkoutOrder || !isCheckoutOrderPayable(checkoutOrder))) {
    return NextResponse.json(
      { error: 'Checkout order is not available.' },
      { status: 404 }
    );
  }
  if (checkoutOrder && checkoutOrder.orderType !== 'subscription') {
    return NextResponse.json(
      { error: 'Checkout order is not a subscription.' },
      { status: 400 }
    );
  }

  const templateId = checkoutOrder?.subscriptionTemplateId ?? Number(body.templateId);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json(
      { error: 'templateId or checkoutToken is required.' },
      { status: 400 }
    );
  }

  const template = await getSubscriptionTemplateById(templateId);
  if (!template) {
    return NextResponse.json(
      { error: 'Invalid PayPal subscription template.' },
      { status: 400 }
    );
  }
  const changeMode =
    changeModeFromBody ??
    normalizeChangeMode(checkoutOrder?.parsedMetadata?.subscription?.changeMode);
  if (checkoutOrder) {
    await markCheckoutOrderProviderPending({
      checkoutOrderId: checkoutOrder.id,
      provider: 'paypal',
      paymentMethod: 'paypal',
      providerSessionId: body.subscriptionId
    });
  }

  try {
    const templateSnapshot = createCheckoutTemplateSnapshot(template);
    const subscription = await confirmPayPalSubscriptionForTeam({
      teamId: team.id,
      subscriptionId: body.subscriptionId,
      template
    });
    const activeAssignment = await getActiveTeamSubscriptionAssignment(team.id);
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
          targetType: 'team',
          targetId: team.id,
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
          teamId: team.id,
          templateId: template.id,
          changeMode,
          effectiveAt: changeRequest.effectiveAt?.toISOString() ?? null
        },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: team.id,
          source: '/api/paypal/checkout'
        }
      );
    }

    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: mapSubscriptionStatusToOrderStatus(subscription.subscriptionStatus),
      logStatus: 'success',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: team.id,
      targetType: 'team',
      targetTeamId: team.id,
      subscriptionTemplateId: template.id,
      templateSnapshot,
      paymentMethod: 'paypal',
      planName: subscription.planName || template.name,
      providerPlanId: subscription.planId,
      externalPaymentId: body.subscriptionId,
      amount: template.priceCents,
      currency: template.currency,
      message: 'PayPal subscription confirmed.',
      metadata: {
        planName: subscription.planName,
        templateId: template.id,
        checkoutOrderId: checkoutOrder?.id ?? null,
        checkoutToken: checkoutOrder?.checkoutToken ?? null,
        checkoutOrderSubscription:
          checkoutOrder?.parsedMetadata?.subscription ?? null,
        planRelation,
        subscriptionChange
      },
      providerMetadata: {
        subscriptionId: body.subscriptionId,
        planId: subscription.planId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
    if (checkoutOrder) {
      await markCheckoutOrderCompleted({
        checkoutOrderId: checkoutOrder.id,
        provider: 'paypal',
        providerReferenceId: body.subscriptionId
      });
    }

    return NextResponse.json({
      ok: true,
      redirectUrl: '/dashboard',
      subscription
    });
  } catch (error) {
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: 'failed',
      logStatus: 'failed',
      eventType: CHECKOUT_SYSTEM_EVENTS.checkoutCompleted,
      source: 'checkout',
      teamId: team.id,
      targetType: 'team',
      targetTeamId: team.id,
      subscriptionTemplateId: template.id,
      templateSnapshot: createCheckoutTemplateSnapshot(template),
      paymentMethod: 'paypal',
      planName: template.name,
      providerPlanId: null,
      externalPaymentId: body.subscriptionId,
      amount: template.priceCents,
      currency: template.currency,
      providerMetadata: {
        subscriptionId: body.subscriptionId
      },
      metadata: {
        checkoutOrderId: checkoutOrder?.id ?? null,
        checkoutToken: checkoutOrder?.checkoutToken ?? null,
        checkoutOrderSubscription:
          checkoutOrder?.parsedMetadata?.subscription ?? null
      },
      message: 'Unable to confirm PayPal subscription.'
    });
    if (checkoutOrder) {
      await markCheckoutOrderFailed({
        checkoutOrderId: checkoutOrder.id,
        provider: 'paypal',
        providerReferenceId: body.subscriptionId
      });
    }
    console.error('Error confirming PayPal subscription:', error);
    return NextResponse.json(
      { error: 'Unable to confirm PayPal subscription.' },
      { status: 500 }
    );
  }
}
