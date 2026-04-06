'use server';

import {
  inviteTeamMember as inviteTeamMemberBase,
  removeTeamMember as removeTeamMemberBase
} from '@/app/(login)/actions';
import { customerPortalAction as customerPortalActionBase } from '@/lib/payments/actions';
import { getTeamForUser } from '@/lib/db/queries';
import { getDashboardFeatureController } from '../controller';
import {
  areTeamInvitesEnabledBySubscription,
  canAddTeamMemberBySubscription,
  getTeamMemberLimitBySubscriptionFeatureController
} from '@/lib/organizations/subscription-limit-values';

async function canInviteTeamMember() {
  const [featureController, team] = await Promise.all([
    getDashboardFeatureController('organization'),
    getTeamForUser()
  ]);

  if (!areTeamInvitesEnabledBySubscription(featureController)) {
    return {
      allowed: false,
      message:
        'Invites are disabled for this subscription. Contact your administrator.'
    } as const;
  }

  if (!team) {
    return { allowed: true } as const;
  }

  const maxMembers =
    getTeamMemberLimitBySubscriptionFeatureController(featureController);

  if (
    !canAddTeamMemberBySubscription({
      currentMemberCount: team.teamMembers.length,
      maxMembers
    })
  ) {
    return {
      allowed: false,
      message: `Team member limit reached (${maxMembers}).`
    } as const;
  }

  return { allowed: true } as const;
}

export async function inviteTeamMember(
  ...args: Parameters<typeof inviteTeamMemberBase>
) {
  const invitePermission = await canInviteTeamMember();
  if (!invitePermission.allowed) {
    return { error: invitePermission.message };
  }

  return inviteTeamMemberBase(...args);
}

export async function removeTeamMember(
  ...args: Parameters<typeof removeTeamMemberBase>
) {
  return removeTeamMemberBase(...args);
}

export async function customerPortalAction(
  ...args: Parameters<typeof customerPortalActionBase>
) {
  return customerPortalActionBase(...args);
}
