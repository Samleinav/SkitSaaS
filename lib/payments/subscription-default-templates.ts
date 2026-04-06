import {
  DASHBOARD_SUBSCRIPTION_FEATURES,
  USER_SUBSCRIPTION_FEATURES
} from '@/lib/features/catalog';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';

export const FREE_USER_SUBSCRIPTION_TEMPLATE_ID = 1;
export const FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID = 2;
export const FREE_USER_SUBSCRIPTION_TEMPLATE_NAME = 'Free User';
export const FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME = 'Free Organization';
export const FREE_USER_MAX_ORGANIZATIONS = 3;
export const FREE_ORGANIZATION_MAX_TEAM_MEMBERS = 3;
export const FREE_ORGANIZATION_INVITES_ENABLED = true;

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
  return (
    templateId === FREE_USER_SUBSCRIPTION_TEMPLATE_ID ||
    templateId === FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID
  );
}

export function getReservedFreeSubscriptionTemplateIdForScope(
  targetScope: SubscriptionTargetScope
) {
  return targetScope === 'user'
    ? FREE_USER_SUBSCRIPTION_TEMPLATE_ID
    : FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
}

export function getReservedFreeSubscriptionTemplateIdForTargetType(
  targetType: 'user' | 'team'
) {
  return targetType === 'user'
    ? FREE_USER_SUBSCRIPTION_TEMPLATE_ID
    : FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID;
}

export function getReservedFreeSubscriptionTemplateNameForTargetType(
  targetType: 'user' | 'team'
) {
  return targetType === 'user'
    ? FREE_USER_SUBSCRIPTION_TEMPLATE_NAME
    : FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME;
}

export function isReservedFreeTemplateScopeLocked({
  templateId,
  targetScope
}: {
  templateId: number;
  targetScope: SubscriptionTargetScope;
}) {
  return templateId === getReservedFreeSubscriptionTemplateIdForScope(targetScope);
}

export function getReservedFreeTemplateDefinitionById(
  templateId: number | null | undefined
) {
  return (
    getReservedFreeTemplateDefinitions().find((definition) => definition.id === templateId) ??
    null
  );
}

export function getReservedFreeTemplateRequiredFeatures(
  templateId: number | null | undefined
) {
  return getReservedFreeTemplateDefinitionById(templateId)?.features ?? [];
}

export function getReservedFreeTemplateDefinitions(): ReservedFreeTemplateDefinition[] {
  return [
    {
      id: FREE_USER_SUBSCRIPTION_TEMPLATE_ID,
      name: FREE_USER_SUBSCRIPTION_TEMPLATE_NAME,
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
      id: FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_ID,
      name: FREE_ORGANIZATION_SUBSCRIPTION_TEMPLATE_NAME,
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
