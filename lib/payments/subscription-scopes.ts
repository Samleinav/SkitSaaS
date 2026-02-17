export const SUBSCRIPTION_TARGET_SCOPES = ['user', 'organization'] as const;

export type SubscriptionTargetScope =
  (typeof SUBSCRIPTION_TARGET_SCOPES)[number];

export const SUBSCRIPTION_TARGET_SCOPE_SET = new Set<string>(
  SUBSCRIPTION_TARGET_SCOPES
);

export const SUBSCRIPTION_TARGET_SCOPE_SORT_WEIGHT: Record<
  SubscriptionTargetScope,
  number
> = {
  user: 0,
  organization: 1
};
