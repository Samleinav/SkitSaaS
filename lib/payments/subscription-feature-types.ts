export const SUBSCRIPTION_FEATURE_VALUE_TYPES = [
  'text',
  'number',
  'boolean',
  'null'
] as const;

export type SubscriptionFeatureValueType =
  (typeof SUBSCRIPTION_FEATURE_VALUE_TYPES)[number];

export const SUBSCRIPTION_FEATURE_VALUE_TYPE_SET = new Set<string>(
  SUBSCRIPTION_FEATURE_VALUE_TYPES
);
