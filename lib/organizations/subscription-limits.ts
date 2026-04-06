import { USER_SUBSCRIPTION_FEATURES } from '@/lib/features/catalog';
import { getCurrentUserOrganizationCount } from '@/lib/db/queries';
import { getCurrentFeatureControllerByScope } from '@/lib/features/subscription';
export {
  areTeamInvitesEnabledBySubscription,
  canAddTeamMemberBySubscription,
  getTeamMemberLimitBySubscriptionFeatureController,
  resolveTeamMemberLimitBySubscription,
  resolveUserOrganizationLimitBySubscription
} from '@/lib/organizations/subscription-limit-values';
import { resolveUserOrganizationLimitBySubscription } from '@/lib/organizations/subscription-limit-values';

export async function getCurrentUserOrganizationLimitBySubscription() {
  const featureController = await getCurrentFeatureControllerByScope('user');

  const configuredLimit = featureController.int(
    USER_SUBSCRIPTION_FEATURES.organizationsMax.key,
    null
  );

  return resolveUserOrganizationLimitBySubscription(configuredLimit);
}

export function canCreateOrganizationBySubscription({
  currentOrganizationCount,
  maxOrganizations
}: {
  currentOrganizationCount: number;
  maxOrganizations: number | null;
}) {
  if (maxOrganizations === null) {
    return true;
  }

  return currentOrganizationCount < maxOrganizations;
}

export async function canCurrentUserCreateOrganizationBySubscription() {
  const [maxOrganizations, currentOrganizationCount] = await Promise.all([
    getCurrentUserOrganizationLimitBySubscription(),
    getCurrentUserOrganizationCount()
  ]);

  return canCreateOrganizationBySubscription({
    currentOrganizationCount,
    maxOrganizations
  });
}
