'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  buildFormValidationMessage,
  parseOptionalPositiveInt
} from '@skitsaas/sdk';
import { db } from '@/lib/db/drizzle';
import {
  getActiveTeamSubscriptionAssignment,
  getActiveUserSubscriptionAssignment
} from '@/lib/db/queries';
import { teams, teamMembers } from '@/lib/db/schema';
import { cancelPayPalSubscription, isPayPalConfigured } from '@/lib/payments/paypal';
import { createCustomerPortalSession, isStripeConfigured } from '@/lib/payments/stripe';
import {
  recordPayPalCheckoutEvent,
  recordSystemCheckoutEvent
} from '@/lib/payments/checkout-system';
import { isSubscriptionMutationBlocked } from '@/lib/payments/subscription-single-writer';
import { createSysActivityLog } from '@/lib/system/activity-logs';
import { suspendSubscriptionAssignment } from '@/lib/payments/subscription-assignments';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { dashboardValidatedAction, revalidateDashboardRoot } from '../controller';
import {
  createDashboardCancelUserSubscriptionBuildFormBase,
  createDashboardManageOrganizationSubscriptionBuildFormBase
} from './forms';
import {
  createDashboardSubscriptionInvalidFactory
} from './validation';
import { dashboardSubscriptionValidationMessage } from './validation-messages';

function revalidateDashboardSubscriptions() {
  revalidatePath('/dashboard/subscriptions');
}

async function getUserTeamMembership({
  userId,
  teamId
}: {
  userId: number;
  teamId: number;
}) {
  const [membership] = await db
    .select({
      memberRole: teamMembers.role,
      team: teams
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)))
    .limit(1);

  if (!membership) {
    return null;
  }

  const assignment = await getActiveTeamSubscriptionAssignment(membership.team.id);

  return {
    ...membership,
    team: {
      ...membership.team,
      paymentProvider: assignment?.paymentProvider ?? null,
      providerReferenceId: assignment?.providerReferenceId ?? null,
      providerPlanId: assignment?.providerPlanId ?? null,
      planName: assignment?.planName ?? null,
      subscriptionStatus: assignment?.status ?? null,
      subscriptionTemplateId: assignment?.subscriptionTemplateId ?? null
    }
  };
}

const dashboardManageOrganizationSubscriptionBuildForm =
  createDashboardManageOrganizationSubscriptionBuildFormBase();
const dashboardCancelUserSubscriptionBuildForm =
  createDashboardCancelUserSubscriptionBuildFormBase();

export const manageOrganizationSubscriptionAction = dashboardValidatedAction(
  dashboardManageOrganizationSubscriptionBuildForm,
  async ({ user, values }) => {
    const invalid = await createDashboardSubscriptionInvalidFactory(values);
    const teamIdPayload = parseOptionalPositiveInt(values.teamId);
    const teamId = teamIdPayload.value;

    if (!teamIdPayload.valid || !teamId) {
      return invalid({}, buildFormValidationMessage.positiveInteger('Organization id'));
    }

    const membership = await getUserTeamMembership({
      userId: user.id,
      teamId
    });

    if (!membership || membership.memberRole !== 'owner') {
      return invalid(
        {},
        dashboardSubscriptionValidationMessage.organizationUnavailable()
      );
    }

    if (membership.team.paymentProvider === 'paypal') {
      await emitEventAsync(
        EVENT_HOOKS.dashboardSubscriptionsOrganizationCancelRequested,
        { teamId: membership.team.id, provider: 'paypal' },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: membership.team.id,
          source: '/dashboard/subscriptions'
        }
      );

      if (!(await isPayPalConfigured())) {
        return invalid(
          {},
          dashboardSubscriptionValidationMessage.providerUnavailable()
        );
      }

      if (!membership.team.providerReferenceId) {
        return invalid(
          {},
          dashboardSubscriptionValidationMessage.providerUnavailable()
        );
      }

      await cancelPayPalSubscription(membership.team.providerReferenceId);

      await recordPayPalCheckoutEvent({
        orderType: 'subscription',
        status: 'canceled',
        logStatus: 'success',
        eventType: 'billing.cancelled_by_customer',
        source: 'dashboard',
        teamId: membership.team.id,
        subscriptionTemplateId: membership.team.subscriptionTemplateId,
        paymentMethod: 'paypal',
        planName: membership.team.planName,
        providerPlanId: membership.team.providerPlanId,
        externalPaymentId: membership.team.providerReferenceId,
        providerMetadata: {
          subscriptionId: membership.team.providerReferenceId,
          planId: membership.team.providerPlanId
        },
        message: 'PayPal subscription canceled from dashboard subscriptions.'
      });

      await createSysActivityLog({
        eventType: 'dashboard.subscriptions.organization.cancel',
        eventCategory: 'dashboard',
        action: 'update',
        status: 'success',
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        teamId: membership.team.id,
        entityType: 'team_subscription',
        entityId: String(membership.team.id),
        source: '/dashboard/subscriptions',
        message: 'User canceled organization PayPal subscription from dashboard.'
      });

      await emitEventAsync(
        EVENT_HOOKS.dashboardSubscriptionsOrganizationCanceled,
        { teamId: membership.team.id, provider: 'paypal' },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: membership.team.id,
          source: '/dashboard/subscriptions'
        }
      );

      return true;
    }

    if (membership.team.paymentProvider === 'stripe') {
      if (
        !(await isStripeConfigured()) ||
        !membership.team.stripeCustomerId ||
        !membership.team.stripeProductId
      ) {
        return invalid(
          {},
          dashboardSubscriptionValidationMessage.providerUnavailable()
        );
      }

      const portalSession = await createCustomerPortalSession(membership.team);
      await emitEventAsync(
        EVENT_HOOKS.dashboardSubscriptionsPortalOpened,
        { teamId: membership.team.id, provider: 'stripe' },
        {
          actorUserId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          teamId: membership.team.id,
          source: '/dashboard/subscriptions'
        }
      );
      redirect(portalSession.url);
    }

    return invalid(
      {},
      dashboardSubscriptionValidationMessage.organizationUnavailable()
    );
  },
  {
    revalidate: [revalidateDashboardRoot, revalidateDashboardSubscriptions]
  }
);

export const cancelUserSubscriptionAction = dashboardValidatedAction(
  dashboardCancelUserSubscriptionBuildForm,
  async ({ user, values }) => {
    const invalid = await createDashboardSubscriptionInvalidFactory(values);
    const assignment = await getActiveUserSubscriptionAssignment(user.id);
    if (!assignment) {
      return invalid(
        {},
        dashboardSubscriptionValidationMessage.userSubscriptionUnavailable()
      );
    }

    await emitEventAsync(
      EVENT_HOOKS.dashboardSubscriptionsUserCancelRequested,
      { userId: user.id, templateId: assignment.subscriptionTemplateId },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: user.id,
        source: '/dashboard/subscriptions'
      }
    );

    if (
      isSubscriptionMutationBlocked(
        'dashboard.subscriptions.cancel_user_subscription_action'
      )
    ) {
      await recordSystemCheckoutEvent({
        orderType: 'subscription',
        status: 'canceled',
        logStatus: 'success',
        eventType: 'billing.user_subscription_cancelled',
        source: 'dashboard',
        targetType: 'user',
        targetUserId: user.id,
        subscriptionTemplateId: assignment.subscriptionTemplateId,
        paymentMethod: 'manual',
        planName: assignment.planName ?? assignment.templateName ?? null,
        providerPlanId: assignment.providerPlanId ?? null,
        message: 'User canceled user-scope subscription from dashboard.',
        metadata: {
          reason: 'user_requested_cancel'
        },
        providerMetadata: {
          reason: 'user_requested_cancel',
          targetType: 'user',
          userId: user.id
        }
      });
    } else {
      await suspendSubscriptionAssignment({
        targetType: 'user',
        targetId: user.id,
        status: 'canceled',
        sourceOrderId: null
      });
    }

    await createSysActivityLog({
      eventType: 'dashboard.subscriptions.user.cancel',
      eventCategory: 'dashboard',
      action: 'update',
      status: 'success',
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      targetUserId: user.id,
      entityType: 'user_subscription',
      entityId: String(user.id),
      source: '/dashboard/subscriptions',
      message: 'User canceled user-scope subscription from dashboard.'
    });

    await emitEventAsync(
      EVENT_HOOKS.dashboardSubscriptionsUserCanceled,
      { userId: user.id, templateId: assignment.subscriptionTemplateId },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetUserId: user.id,
        source: '/dashboard/subscriptions'
      }
    );

    return true;
  },
  {
    revalidate: [revalidateDashboardRoot, revalidateDashboardSubscriptions]
  }
);
