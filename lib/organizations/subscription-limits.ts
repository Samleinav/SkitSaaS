import { USER_SUBSCRIPTION_FEATURES } from '@/lib/features/catalog';
import { getCurrentUserOrganizationCount } from '@/lib/db/queries';
import { getCurrentFeatureControllerByScope } from '@/lib/features/subscription';

export async function getCurrentUserOrganizationLimitBySubscription() {
  const featureController = await getCurrentFeatureControllerByScope('user');

  const configuredLimit = featureController.int(
    USER_SUBSCRIPTION_FEATURES.organizationsMax.key,
    USER_SUBSCRIPTION_FEATURES.organizationsMax.defaultValue
  );

  if (configuredLimit === null) {
    return null;
  }

  const minimumLimit = USER_SUBSCRIPTION_FEATURES.organizationsMax.min ?? 1;
  return Math.max(configuredLimit, minimumLimit);
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
