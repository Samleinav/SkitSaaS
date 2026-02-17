export const SUBSCRIPTION_BILLING_INTERVALS = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'yearly'
] as const;

export type SubscriptionBillingInterval =
  (typeof SUBSCRIPTION_BILLING_INTERVALS)[number];

export const SUBSCRIPTION_BILLING_INTERVAL_SET = new Set<string>(
  SUBSCRIPTION_BILLING_INTERVALS
);

export const SUBSCRIPTION_BILLING_INTERVAL_SORT_WEIGHT: Record<
  SubscriptionBillingInterval,
  number
> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  quarterly: 3,
  semiannual: 4,
  yearly: 5
};
