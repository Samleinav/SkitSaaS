import {
  DASHBOARD_SUBSCRIPTION_FEATURES,
  USER_SUBSCRIPTION_FEATURES
} from '@/lib/features/catalog';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';

export const DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID = 1;
export const DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID = 2;
export const DEFAULT_USER_SUBSCRIPTION_TEMPLATE_NAME = 'Free User';
export const DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME =
  'Free Organization';

// Backward-compatible aliases while callers migrate from older "free" and
// "baseline" naming to reserved default-tier semantics.
export const BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID =
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID;
export const BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID =
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
export const BASELINE_USER_SUBSCRIPTION_TEMPLATE_NAME =
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_NAME;
export const BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME =
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME;
export const FREE_USER_SUBSCRIPTION_TEMPLATE_ID =
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID;
export const FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID =
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
export const FREE_USER_SUBSCRIPTION_TEMPLATE_NAME =
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_NAME;
export const FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME =
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME;
export const FREE_USER_MAX_ORGANIZATIONS = 3;
export const FREE_ORGANIZATION_MAX_TEAM_MEMBERS = 3;
export const FREE_ORGANIZATION_INVITES_ENABLED = true;
export const RESERVED_DEFAULT_SUBSCRIPTION_TEMPLATE_IDS = [
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID,
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID
] as const;
export const RESERVED_BASELINE_SUBSCRIPTION_TEMPLATE_IDS = [
  DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID,
  DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID
] as const;

export const SUBSCRIPTION_TEMPLATE_PUBLICATION_STATUSES = [
  'draft',
  'published'
] as const;

export type SubscriptionTemplatePublicationStatus =
  (typeof SUBSCRIPTION_TEMPLATE_PUBLICATION_STATUSES)[number];

export type ReservedFreeTemplateDefinition = {
  id: number;
  name: string;
  targetScope: SubscriptionTargetScope;
  categoryKey: string;
  hierarchyRank: number;
  billingInterval: 'monthly';
  priceCents: number;
  compareAtPriceCents: null;
  currency: string;
  trialPeriodDays: number;
  publicationStatus: SubscriptionTemplatePublicationStatus;
  features: Array<{
    key: string;
    label: string;
    valueType: 'boolean' | 'number';
    value: string;
    valueLabel: string | null;
    isPublic: boolean;
  }>;
};

export function normalizeSubscriptionTemplatePublicationStatus(
  value: string | null | undefined
): SubscriptionTemplatePublicationStatus | null {
  if (value === 'draft' || value === 'published') {
    return value;
  }

  return null;
}

export function isReservedFreeSubscriptionTemplateId(
  templateId: number | null | undefined
) {
  return isReservedDefaultSubscriptionTemplateId(templateId);
}

export function isReservedBaselineSubscriptionTemplateId(
  templateId: number | null | undefined
) {
  return isReservedDefaultSubscriptionTemplateId(templateId);
}

export function isReservedDefaultSubscriptionTemplateId(
  templateId: number | null | undefined
) {
  return (
    templateId === DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID ||
    templateId === DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID
  );
}

export function isSubscriptionTemplateVisibleInAdminCatalog(
  templateId: number | null | undefined
) {
  return !isReservedDefaultSubscriptionTemplateId(templateId);
}

export function isSubscriptionTemplateSelfServiceEligible(template: {
  id: number | null | undefined;
  publicationStatus?: string | null;
}) {
  return (
    typeof template.id === 'number' &&
    template.id > 0 &&
    template.publicationStatus === 'published'
  );
}

export function resolveDefaultTierFallbackAssignmentStatus(template: {
  priceCents?: number | null;
} | null | undefined): 'free' | 'unpaid' {
  return template?.priceCents === 0 ? 'free' : 'unpaid';
}

export function getReservedFreeSubscriptionTemplateIdForScope(
  targetScope: SubscriptionTargetScope
) {
  return getReservedBaselineSubscriptionTemplateIdForScope(targetScope);
}

export function getReservedBaselineSubscriptionTemplateIdForScope(
  targetScope: SubscriptionTargetScope
) {
  return getReservedDefaultSubscriptionTemplateIdForScope(targetScope);
}

export function getReservedDefaultSubscriptionTemplateIdForScope(
  targetScope: SubscriptionTargetScope
) {
  return targetScope === 'user'
    ? DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID
    : DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
}

export function getReservedFreeSubscriptionTemplateIdForTargetType(
  targetType: 'user' | 'team'
) {
  return getReservedBaselineSubscriptionTemplateIdForTargetType(targetType);
}

export function getReservedBaselineSubscriptionTemplateIdForTargetType(
  targetType: 'user' | 'team'
) {
  return getReservedDefaultSubscriptionTemplateIdForTargetType(targetType);
}

export function getReservedDefaultSubscriptionTemplateIdForTargetType(
  targetType: 'user' | 'team'
) {
  return targetType === 'user'
    ? DEFAULT_USER_SUBSCRIPTION_TEMPLATE_ID
    : DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
}

export function getReservedFreeSubscriptionTemplateNameForTargetType(
  targetType: 'user' | 'team'
) {
  return getReservedBaselineSubscriptionTemplateNameForTargetType(targetType);
}

export function getReservedBaselineSubscriptionTemplateNameForTargetType(
  targetType: 'user' | 'team'
) {
  return getReservedDefaultSubscriptionTemplateNameForTargetType(targetType);
}

export function getReservedDefaultSubscriptionTemplateNameForTargetType(
  targetType: 'user' | 'team'
) {
  return targetType === 'user'
    ? DEFAULT_USER_SUBSCRIPTION_TEMPLATE_NAME
    : DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME;
}

export function isReservedFreeTemplateScopeLocked({
  templateId,
  targetScope
}: {
  templateId: number;
  targetScope: SubscriptionTargetScope;
}) {
  return templateId === getReservedDefaultSubscriptionTemplateIdForScope(targetScope);
}

export function getReservedFreeTemplateDefinitionById(
  templateId: number | null | undefined
) {
  return getReservedBaselineTemplateDefinitionById(templateId);
}

export function getReservedBaselineTemplateDefinitionById(
  templateId: number | null | undefined
) {
  return (
    getReservedBaselineTemplateDefinitions().find(
      (definition) => definition.id === templateId
    ) ?? null
  );
}

export function getReservedFreeTemplateRequiredFeatures(
  templateId: number | null | undefined
) {
  return getReservedBaselineTemplateRequiredFeatures(templateId);
}

export function getReservedBaselineTemplateRequiredFeatures(
  templateId: number | null | undefined
) {
  return getReservedBaselineTemplateDefinitionById(templateId)?.features ?? [];
}

export function getReservedFreeTemplateDefinitions(): ReservedFreeTemplateDefinition[] {
  return getReservedBaselineTemplateDefinitions();
}

export function getReservedBaselineTemplateDefinitions(): ReservedFreeTemplateDefinition[] {
  return [
    {
      id: BASELINE_USER_SUBSCRIPTION_TEMPLATE_ID,
      name: DEFAULT_USER_SUBSCRIPTION_TEMPLATE_NAME,
      targetScope: 'user',
      categoryKey: 'free.user',
      hierarchyRank: 0,
      billingInterval: 'monthly',
      priceCents: 0,
      compareAtPriceCents: null,
      currency: 'USD',
      trialPeriodDays: 0,
      publicationStatus: 'draft',
      features: [
        {
          key: USER_SUBSCRIPTION_FEATURES.organizationsMax.key,
          label: USER_SUBSCRIPTION_FEATURES.organizationsMax.label,
          valueType: USER_SUBSCRIPTION_FEATURES.organizationsMax.valueType,
          value: String(FREE_USER_MAX_ORGANIZATIONS),
          valueLabel: null,
          isPublic: false
        }
      ]
    },
    {
      id: BASELINE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
      name: DEFAULT_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME,
      targetScope: 'organization',
      categoryKey: 'free.organization',
      hierarchyRank: 0,
      billingInterval: 'monthly',
      priceCents: 0,
      compareAtPriceCents: null,
      currency: 'USD',
      trialPeriodDays: 0,
      publicationStatus: 'draft',
      features: [
        {
          key: DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.key,
          label: DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.label,
          valueType: DASHBOARD_SUBSCRIPTION_FEATURES.teamInvitesEnabled.valueType,
          value: FREE_ORGANIZATION_INVITES_ENABLED ? 'true' : 'false',
          valueLabel: null,
          isPublic: false
        },
        {
          key: DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.key,
          label: DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.label,
          valueType: DASHBOARD_SUBSCRIPTION_FEATURES.teamMembersMax.valueType,
          value: String(FREE_ORGANIZATION_MAX_TEAM_MEMBERS),
          valueLabel: null,
          isPublic: false
        }
      ]
    }
  ];
}
