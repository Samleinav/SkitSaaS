import type { FeatureController } from '@/lib/features/controller';
import {
  DASHBOARD_SUBSCRIPTION_FEATURES,
  USER_SUBSCRIPTION_FEATURES,
  resolveManagedSubscriptionNumberLimit
} from '@/lib/features/catalog';

export function resolveUserOrganizationLimitBySubscription(
  configuredLimit: number | null | undefined
) {
  return resolveManagedSubscriptionNumberLimit({
    definition: USER_SUBSCRIPTION_FEATURES.organizationsMax,
    configuredLimit,
    fallback: 1
  });
}

export function resolveTeamMemberLimitBySubscription(
  configuredLimit: number | null | undefined
) {
  return resolveManagedSubscriptionNumberLimit({
    definition: DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax,
    configuredLimit,
    fallback: 1
  });
}

export function areTeamInvitesEnabledBySubscription(
  featureController: Pick<FeatureController, 'bool'>
) {
  return featureController.bool(
    DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.key,
    false
  );
}

export function getTeamMemberLimitBySubscriptionFeatureController(
  featureController: Pick<FeatureController, 'int'>
) {
  const configuredLimit = featureController.int(
    DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key,
    null
  );

  return resolveTeamMemberLimitBySubscription(configuredLimit);
}

export function canAddTeamMemberBySubscription({
  currentMemberCount,
  maxMembers
}: {
  currentMemberCount: number;
  maxMembers: number | null;
}) {
  if (maxMembers === null) {
    return true;
  }

  return currentMemberCount < maxMembers;
}
