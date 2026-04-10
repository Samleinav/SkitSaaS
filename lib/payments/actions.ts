'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createCustomerPortalSession } from './stripe';
import { cancelPayPalSubscription } from './paypal';
import { withTeam } from '@/lib/auth/middleware';
import {
  getActiveUserSubscriptionAssignment,
  getActiveTeamSubscriptionAssignment,
  getTeamById,
  getTeamForUser,
  getUser,
  getSelfServiceSubscriptionTemplateById
} from '@/lib/db/queries';
import { recordPayPalCheckoutEvent } from './checkout-system';
import {
  createSubscriptionCheckoutOrder,
  createUserSubscriptionCheckoutOrder,
  getCheckoutOrderByTokenForUser,
  isCheckoutOrderPayable
} from './checkout-orders';
import { startCheckoutPaymentByMethod } from './payment-methods';
import { getSignupIntentCheckoutAccessByToken } from './signup-intents';
import { areTeamsEnabled } from '@/lib/organizations/config';
import { createSubscriptionChangeRequest } from './subscription-change';
import { replaceWithSubscriptionTemplateAssignment } from './subscription-assignments';
import {
  isSubscriptionTemplateScopeCompatible,
  supportsSelfServiceSubscriptionTemplateScope
} from './subscription-scope';

function ensureTeamOwnerAccess({
  teamMembers,
  userId
}: {
  teamMembers: { userId: number; role: string }[];
  userId: number;
}) {
  const currentMember = teamMembers.find((member) => member.userId === userId);
  if (!currentMember || currentMember.role !== 'owner') {
    redirect('/dashboard');
  }
}

function normalizeChangeMode(value: FormDataEntryValue | null) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

type ActiveAssignmentForSelfServiceChange = {
  id: number;
  subscriptionTemplateId: number;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
} | null;

type ZeroCostSelfServiceTemplate = {
  id: number;
  name: string;
  priceCents: number;
  currency: string;
};

function revalidateSubscriptionSelfServicePaths() {
  revalidatePath('/pricing');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/subscriptions');
}

async function applyZeroCostSelfServiceSubscription({
  targetType,
  targetId,
  template,
  changeMode,
  activeAssignment,
  scheduledStartTime
}: {
  targetType: 'team' | 'user';
  targetId: number;
  template: ZeroCostSelfServiceTemplate;
  changeMode: 'immediate' | 'period_end' | null;
  activeAssignment: ActiveAssignmentForSelfServiceChange;
  scheduledStartTime: string | null;
}) {
  if (template.priceCents !== 0) {
    return false;
  }

  const requestedStartDate = scheduledStartTime
    ? new Date(scheduledStartTime)
    : null;
  const effectiveAt =
    requestedStartDate && !Number.isNaN(requestedStartDate.valueOf())
      ? requestedStartDate
      : null;

  if (changeMode === 'period_end' && effectiveAt) {
    await createSubscriptionChangeRequest({
      targetType,
      targetId,
      requestedTemplateId: template.id,
      currentAssignmentId: activeAssignment?.id ?? null,
      currentTemplateId: activeAssignment?.subscriptionTemplateId ?? null,
      requestedProvider: null,
      requestedPaymentMethod: null,
      requestedProviderPlanId: null,
      requestedPlanName: template.name,
      changeReason: 'plan_change',
      changeMode: 'period_end',
      currentPeriodEnd: activeAssignment?.currentPeriodEnd ?? null,
      trialEndsAt: activeAssignment?.trialEndsAt ?? null,
      effectiveAt,
      sourceOrderId: null,
      metadata: {
        source: 'pricing_zero_cost',
        priceCents: template.priceCents,
        currency: template.currency
      }
    });
    return true;
  }

  await replaceWithSubscriptionTemplateAssignment({
    targetType,
    targetId,
    subscriptionTemplateId: template.id,
    status: 'free',
    planName: template.name,
    closeStatus: 'canceled',
    sourceOrderId: null
  });
  return true;
}

function resolveCheckoutOrigin() {
  const baseUrl = process.env.BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/+$/, '');
}

function normalizePaymentMethodId(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

async function startCheckoutPaymentFromAction({
  formData,
  user,
  paymentMethodIdOverride = null
}: {
  formData: FormData;
  user: {
    id: number;
    email: string;
    role: string;
  } | null;
  paymentMethodIdOverride?: string | null;
}) {
  const checkoutTokenValue = formData.get('checkoutToken');
  const checkoutToken =
    typeof checkoutTokenValue === 'string' ? checkoutTokenValue.trim() : '';
  if (!checkoutToken) {
    redirect('/pricing');
  }

  const paymentMethodId =
    paymentMethodIdOverride || normalizePaymentMethodId(formData.get('paymentMethodId'));
  if (!paymentMethodId) {
    redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
  }

  const checkoutAccess = user
    ? await getCheckoutOrderByTokenForUser({
        checkoutToken,
        userId: user.id
      })
    : null;
  const signupIntentAccess =
    !checkoutAccess ? await getSignupIntentCheckoutAccessByToken(checkoutToken) : null;
  if (!checkoutAccess && !signupIntentAccess) {
    if (!user) {
      redirect('/login');
    }

    redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
  }

  const checkoutOrder =
    checkoutAccess?.checkoutOrder ?? signupIntentAccess?.checkoutOrder ?? null;
  if (!checkoutOrder || !isCheckoutOrderPayable(checkoutOrder)) {
    redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
  }

  let teamContext: {
    id: number;
    name: string;
    stripeCustomerId: string | null;
    stripeProductId: string | null;
  } | null = null;

  if (checkoutOrder.targetType === 'team') {
    if (!checkoutAccess) {
      redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
    }

    if (checkoutAccess.teamRole !== 'owner') {
      redirect('/dashboard');
    }

    const scopedTeamId = checkoutOrder.targetTeamId ?? checkoutOrder.teamId;
    if (!scopedTeamId) {
      redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
    }

    const team = await getTeamById(scopedTeamId);
    if (!team) {
      redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
    }

    teamContext = {
      id: team.id,
      name: team.name,
      stripeCustomerId: team.stripeCustomerId,
      stripeProductId: team.stripeProductId
    };
  }

  const origin = resolveCheckoutOrigin();
  if (!origin) {
    redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
  }

  const request = new Request(
    `${origin}/api/checkout/${encodeURIComponent(checkoutToken)}/pay/${encodeURIComponent(paymentMethodId)}`,
    { method: 'POST' }
  );

  const result = await startCheckoutPaymentByMethod({
    paymentMethodId,
    checkoutOrder,
    request,
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role
        }
      : null,
    team: teamContext
  });

  if (!result.ok) {
    redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
  }

  if (result.redirectUrl) {
    redirect(result.redirectUrl);
  }

  redirect(`/checkout/${encodeURIComponent(checkoutToken)}`);
}

export async function checkoutAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const templateId = Number(formData.get('templateId'));
  if (!Number.isInteger(templateId) || templateId <= 0) {
    redirect('/pricing');
  }

  const template = await getSelfServiceSubscriptionTemplateById(templateId);
  if (!template) {
    redirect('/pricing');
  }
  const teamsEnabled = areTeamsEnabled();
  if (
    !supportsSelfServiceSubscriptionTemplateScope(template.targetScope, {
      teamsEnabled
    })
  ) {
    redirect('/pricing');
  }

  const changeMode = normalizeChangeMode(formData.get('changeMode'));
  let checkoutOrder: Awaited<ReturnType<typeof createSubscriptionCheckoutOrder>> =
    null;

  if (teamsEnabled) {
    if (
      !isSubscriptionTemplateScopeCompatible({
        checkoutTargetType: 'team',
        templateTargetScope: template.targetScope
      })
    ) {
      redirect('/pricing');
    }

    const team = await getTeamForUser();
    if (!team) {
      redirect('/pricing');
    }

    ensureTeamOwnerAccess({
      teamMembers: team.teamMembers,
      userId: user.id
    });

    const activeAssignment = await getActiveTeamSubscriptionAssignment(team.id);
    if (activeAssignment?.subscriptionTemplateId === template.id) {
      redirect('/pricing');
    }
    const scheduledStartTime =
      changeMode === 'period_end'
        ? activeAssignment?.currentPeriodEnd?.toISOString() ??
          activeAssignment?.trialEndsAt?.toISOString() ??
          null
        : null;
    const resolvedChangeMode =
      changeMode === 'period_end' && !scheduledStartTime
        ? 'immediate'
        : changeMode;

    if (
      await applyZeroCostSelfServiceSubscription({
        targetType: 'team',
        targetId: team.id,
        template,
        changeMode: resolvedChangeMode,
        activeAssignment,
        scheduledStartTime
      })
    ) {
      revalidateSubscriptionSelfServicePaths();
      redirect('/pricing');
    }

    checkoutOrder = await createSubscriptionCheckoutOrder({
      teamId: team.id,
      userId: user.id,
      template,
      changeMode: resolvedChangeMode,
      currentAssignmentId: activeAssignment?.id ?? null,
      currentTemplateId: activeAssignment?.subscriptionTemplateId ?? null,
      scheduledStartTime
    });
  } else {
    if (
      !isSubscriptionTemplateScopeCompatible({
        checkoutTargetType: 'user',
        templateTargetScope: template.targetScope
      })
    ) {
      redirect('/pricing');
    }

    const activeAssignment = await getActiveUserSubscriptionAssignment(user.id);
    if (activeAssignment?.subscriptionTemplateId === template.id) {
      redirect('/pricing');
    }
    const scheduledStartTime =
      changeMode === 'period_end'
        ? activeAssignment?.currentPeriodEnd?.toISOString() ??
          activeAssignment?.trialEndsAt?.toISOString() ??
          null
        : null;
    const resolvedChangeMode =
      changeMode === 'period_end' && !scheduledStartTime
        ? 'immediate'
        : changeMode;

    if (
      await applyZeroCostSelfServiceSubscription({
        targetType: 'user',
        targetId: user.id,
        template,
        changeMode: resolvedChangeMode,
        activeAssignment,
        scheduledStartTime
      })
    ) {
      revalidateSubscriptionSelfServicePaths();
      redirect('/pricing');
    }

    checkoutOrder = await createUserSubscriptionCheckoutOrder({
      userId: user.id,
      template,
      changeMode: resolvedChangeMode,
      currentAssignmentId: activeAssignment?.id ?? null,
      currentTemplateId: activeAssignment?.subscriptionTemplateId ?? null,
      scheduledStartTime
    });
  }

  if (!checkoutOrder) {
    redirect('/pricing');
  }

  redirect(`/checkout/${encodeURIComponent(checkoutOrder.checkoutToken)}`);
}

export async function checkoutWithPaymentMethodAction(formData: FormData) {
  const user = await getUser();
  await startCheckoutPaymentFromAction({
    formData,
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role
        }
      : null
  });
}

export const checkoutWithStripeAction = withTeam(async (formData, team, user) => {
  ensureTeamOwnerAccess({
    teamMembers: team.teamMembers,
    userId: user.id
  });

  await startCheckoutPaymentFromAction({
    formData,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    paymentMethodIdOverride: 'stripe'
  });
});

export const customerPortalAction = withTeam(async (_, team, user) => {
  ensureTeamOwnerAccess({
    teamMembers: team.teamMembers,
    userId: user.id
  });

  if (team.paymentProvider === 'paypal') {
    if (!team.providerReferenceId) {
      redirect('/pricing');
    }

    await cancelPayPalSubscription(team.providerReferenceId);
    await recordPayPalCheckoutEvent({
      orderType: 'subscription',
      status: 'canceled',
      logStatus: 'success',
      eventType: 'billing.cancelled_by_customer',
      source: 'dashboard',
      teamId: team.id,
      subscriptionTemplateId: team.subscriptionTemplateId,
      paymentMethod: 'paypal',
      planName: team.planName,
      providerPlanId: team.providerPlanId,
      externalPaymentId: team.providerReferenceId,
      providerMetadata: {
        subscriptionId: team.providerReferenceId,
        planId: team.providerPlanId
      },
      message: 'PayPal subscription canceled from dashboard.'
    });

    redirect('/dashboard');
  }

  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
