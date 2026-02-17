export const ADMIN_TEAM_SUBSCRIPTION_STATUSES = [
  'free',
  'trialing',
  'active',
  'unpaid',
  'canceled'
] as const;

export const ADMIN_TEAM_SUBSCRIPTION_PROVIDERS = ['stripe', 'paypal'] as const;

export type AdminTeamSubscriptionStatus =
  (typeof ADMIN_TEAM_SUBSCRIPTION_STATUSES)[number];
export type AdminTeamSubscriptionProvider =
  (typeof ADMIN_TEAM_SUBSCRIPTION_PROVIDERS)[number] | null;

type TeamTemplateRef = {
  id: number;
  name: string;
};

const ADMIN_TEAM_SUBSCRIPTION_STATUS_SET = new Set<AdminTeamSubscriptionStatus>(
  ADMIN_TEAM_SUBSCRIPTION_STATUSES
);
const ADMIN_TEAM_SUBSCRIPTION_PROVIDER_SET =
  new Set<(typeof ADMIN_TEAM_SUBSCRIPTION_PROVIDERS)[number]>(
    ADMIN_TEAM_SUBSCRIPTION_PROVIDERS
  );

export function normalizeAdminTeamSubscriptionStatus(
  input: string
): AdminTeamSubscriptionStatus {
  const normalized = input.trim().toLowerCase();
  if (
    ADMIN_TEAM_SUBSCRIPTION_STATUS_SET.has(
      normalized as AdminTeamSubscriptionStatus
    )
  ) {
    return normalized as AdminTeamSubscriptionStatus;
  }

  return 'free';
}

export function normalizeAdminTeamSubscriptionProvider(
  input: string
): AdminTeamSubscriptionProvider {
  const normalized = input.trim().toLowerCase();
  if (
    ADMIN_TEAM_SUBSCRIPTION_PROVIDER_SET.has(
      normalized as (typeof ADMIN_TEAM_SUBSCRIPTION_PROVIDERS)[number]
    )
  ) {
    return normalized as (typeof ADMIN_TEAM_SUBSCRIPTION_PROVIDERS)[number];
  }

  return null;
}

export function resolveAdminTeamPlanName({
  templateName,
  currentPlanName,
  status
}: {
  templateName: string | null;
  currentPlanName: string | null;
  status: AdminTeamSubscriptionStatus;
}) {
  if (templateName) {
    return templateName;
  }

  if (status === 'free') {
    return 'Free';
  }

  const normalizedCurrentPlanName = (currentPlanName || '').trim();
  if (normalizedCurrentPlanName) {
    return normalizedCurrentPlanName.slice(0, 100);
  }

  return 'Free';
}

export function buildAdminTeamSubscriptionUpdate({
  paymentProviderInput,
  subscriptionStatusInput,
  template,
  currentPlanName
}: {
  paymentProviderInput: string;
  subscriptionStatusInput: string;
  template: TeamTemplateRef | null;
  currentPlanName: string | null;
}) {
  const subscriptionStatus = normalizeAdminTeamSubscriptionStatus(
    subscriptionStatusInput
  );

  return {
    paymentProvider: normalizeAdminTeamSubscriptionProvider(paymentProviderInput),
    subscriptionStatus,
    subscriptionTemplateId: template?.id || null,
    planName: resolveAdminTeamPlanName({
      templateName: template?.name || null,
      currentPlanName,
      status: subscriptionStatus
    })
  };
}
