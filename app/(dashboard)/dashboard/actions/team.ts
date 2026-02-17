'use server';

import {
  inviteTeamMember as inviteTeamMemberBase,
  removeTeamMember as removeTeamMemberBase
} from '@/app/(login)/actions';
import { customerPortalAction as customerPortalActionBase } from '@/lib/payments/actions';
import { getTeamForUser } from '@/lib/db/queries';
import { DASHBOARD_SUBSCRIPTION_FEATURES } from '@/lib/features/catalog';
import { getDashboardFeatureController } from '../controller';

async function canInviteTeamMember() {
  const [featureController, team] = await Promise.all([
    getDashboardFeatureController('organization'),
    getTeamForUser()
  ]);

  if (
    !featureController.bool(
      DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.key,
      DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.defaultValue
    )
  ) {
    return {
      allowed: false,
      message:
        'Invites are disabled for this subscription. Contact your administrator.'
    } as const;
  }

  const configuredMaxMembers = featureController.int(
    DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key,
    DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.defaultValue
  );

  if (configuredMaxMembers === null || !team) {
    return { allowed: true } as const;
  }

  const minMembersLimit = DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.min ?? 1;
  const maxMembers = Math.max(configuredMaxMembers, minMembersLimit);

  if (team.teamMembers.length >= maxMembers) {
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
