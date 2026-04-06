import type { SubscriptionFeatureValueType } from '@/lib/payments/subscription-feature-types';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';

type BaseFeatureDefinition = {
  key: string;
  label: string;
  targetScope: SubscriptionTargetScope;
  isPublicByDefault: boolean;
};

type BooleanFeatureDefinition = BaseFeatureDefinition & {
  valueType: 'boolean';
  defaultValue: boolean;
};

type NumberFeatureDefinition = BaseFeatureDefinition & {
  valueType: 'number';
  defaultValue: number | null;
  min?: number;
  max?: number;
  integer?: boolean;
  unlimitedValue?: number;
};

type TextFeatureDefinition = BaseFeatureDefinition & {
  valueType: 'text';
  defaultValue: string | null;
};

type NullFeatureDefinition = BaseFeatureDefinition & {
  valueType: 'null';
  defaultValue: null;
};

export type ManagedSubscriptionFeatureDefinition =
  | BooleanFeatureDefinition
  | NumberFeatureDefinition
  | TextFeatureDefinition
  | NullFeatureDefinition;

export const SUBSCRIPTION_FEATURE_KEYS = {
  DASHBOARD_TEAM_INVITES_ENABLED: 'dashboard.team.invites.enabled',
  DASHBOARD_TEAM_MEMBERS_MAX: 'dashboard.team.members.max',
  DASHBOARD_USER_ORGANIZATIONS_MAX: 'dashboard.user.organizations.max'
} as const;

export type SubscriptionFeatureKey =
  (typeof SUBSCRIPTION_FEATURE_KEYS)[keyof typeof SUBSCRIPTION_FEATURE_KEYS];

export const UNLIMITED_SUBSCRIPTION_QUOTA_VALUE = -1;

export const DASHBOARD_TEAM_INVITES_ENABLED_FEATURE: BooleanFeatureDefinition = {
  key: SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_TEAM_INVITES_ENABLED,
  label: 'Allow team invitations',
  targetScope: 'organization',
  valueType: 'boolean',
  defaultValue: true,
  isPublicByDefault: false
};

export const DASHBOARD_TEAM_MEMBERS_MAX_FEATURE: NumberFeatureDefinition = {
  key: SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_TEAM_MEMBERS_MAX,
  label: 'Max team members',
  targetScope: 'organization',
  valueType: 'number',
  defaultValue: null,
  min: 1,
  integer: true,
  unlimitedValue: UNLIMITED_SUBSCRIPTION_QUOTA_VALUE,
  isPublicByDefault: false
};

export const DASHBOARD_USER_ORGANIZATIONS_MAX_FEATURE: NumberFeatureDefinition = {
  key: SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_USER_ORGANIZATIONS_MAX,
  label: 'Max organizations',
  targetScope: 'user',
  valueType: 'number',
  defaultValue: 3,
  min: 1,
  integer: true,
  unlimitedValue: UNLIMITED_SUBSCRIPTION_QUOTA_VALUE,
  isPublicByDefault: false
};

export const SUBSCRIPTION_FEATURE_DEFINITIONS = {
  [SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_TEAM_INVITES_ENABLED]:
    DASHBOARD_TEAM_INVITES_ENABLED_FEATURE,
  [SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_TEAM_MEMBERS_MAX]:
    DASHBOARD_TEAM_MEMBERS_MAX_FEATURE,
  [SUBSCRIPTION_FEATURE_KEYS.DASHBOARD_USER_ORGANIZATIONS_MAX]:
    DASHBOARD_USER_ORGANIZATIONS_MAX_FEATURE
} satisfies Record<SubscriptionFeatureKey, ManagedSubscriptionFeatureDefinition>;

export const DASHBOARD_SUBSCRIPTION_FEATURES = {
  teamInvitesEnabled: DASHBOARD_TEAM_INVITES_ENABLED_FEATURE,
  teamMembersMax: DASHBOARD_TEAM_MEMBERS_MAX_FEATURE
} as const;

export const USER_SUBSCRIPTION_FEATURES = {
  organizationsMax: DASHBOARD_USER_ORGANIZATIONS_MAX_FEATURE
} as const;

export const SUBSCRIPTION_QUOTA_MINIMUMS = Object.freeze(
  Object.values(SUBSCRIPTION_FEATURE_DEFINITIONS).reduce<
    Partial<Record<SubscriptionFeatureKey, number>>
  >((acc, definition) => {
    if (definition.valueType === 'number' && typeof definition.min === 'number') {
      acc[definition.key as SubscriptionFeatureKey] = definition.min;
    }

    return acc;
  }, {})
);

type ManagedSubscriptionFeatureDraft = {
  featureKey: string;
  featureLabel: string;
  valueType: string;
  featureValue: string | null;
  valueLabel: string | null;
  isPublic: boolean;
};

const TRUE_VALUES = new Set([
  '1',
  'true',
  'yes',
  'y',
  'on',
  'enabled',
  'allow',
  'allowed'
]);

const FALSE_VALUES = new Set([
  '0',
  'false',
  'no',
  'n',
  'off',
  'disabled',
  'deny',
  'denied'
]);

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function normalizeLabel(label: string) {
  return label.trim();
}

function normalizeTextValue(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBooleanValue(value: string | null) {
  const normalized = normalizeTextValue(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

function parseNumberValue(value: string | null) {
  const normalized = normalizeTextValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getManagedDefinition(
  key: string
): ManagedSubscriptionFeatureDefinition | null {
  return (
    SUBSCRIPTION_FEATURE_DEFINITIONS[
      normalizeKey(key) as SubscriptionFeatureKey
    ] ?? null
  );
}

export function isManagedSubscriptionFeatureKey(key: string) {
  return getManagedDefinition(key) !== null;
}

export function getManagedSubscriptionFeatureDefinition(key: string) {
  return getManagedDefinition(key);
}

export function getManagedSubscriptionFeatureDefinitionsByScope(
  targetScope: SubscriptionTargetScope
) {
  return Object.values(SUBSCRIPTION_FEATURE_DEFINITIONS).filter(
    (definition) => definition.targetScope === targetScope
  );
}

export function isManagedSubscriptionFeatureInputValid(
  definitionOrKey: ManagedSubscriptionFeatureDefinition | string,
  rawValue: string | null
) {
  const definition =
    typeof definitionOrKey === 'string'
      ? getManagedDefinition(definitionOrKey)
      : definitionOrKey;

  if (!definition) {
    return false;
  }

  if (definition.valueType === 'null') {
    return true;
  }

  if (definition.valueType === 'boolean') {
    const normalized = normalizeTextValue(rawValue);
    return normalized === null || parseBooleanValue(normalized) !== null;
  }

  if (definition.valueType === 'text') {
    return true;
  }

  const normalized = normalizeTextValue(rawValue);
  if (normalized === null) {
    return true;
  }

  const parsed = parseNumberValue(normalized);
  if (parsed === null) {
    return false;
  }

  if (definition.integer && !Number.isInteger(parsed)) {
    return false;
  }

  if (
    typeof definition.unlimitedValue === 'number' &&
    parsed === definition.unlimitedValue
  ) {
    return true;
  }

  if (typeof definition.min === 'number' && parsed < definition.min) {
    return false;
  }

  if (typeof definition.max === 'number' && parsed > definition.max) {
    return false;
  }

  return true;
}

export function resolveManagedSubscriptionNumberLimit({
  definition,
  configuredLimit,
  fallback = null
}: {
  definition: NumberFeatureDefinition;
  configuredLimit: number | null | undefined;
  fallback?: number | null;
}) {
  if (configuredLimit === null || configuredLimit === undefined) {
    return fallback;
  }

  if (!Number.isFinite(configuredLimit)) {
    return fallback;
  }

  let normalized = configuredLimit;
  if (definition.integer) {
    normalized = Math.trunc(normalized);
  }

  if (
    typeof definition.unlimitedValue === 'number' &&
    normalized === definition.unlimitedValue
  ) {
    return null;
  }

  if (typeof definition.min === 'number' && normalized < definition.min) {
    return fallback;
  }

  if (typeof definition.max === 'number' && normalized > definition.max) {
    normalized = definition.max;
  }

  return normalized;
}

function toStoredFeatureValue(
  definition: ManagedSubscriptionFeatureDefinition,
  rawValue: string | null
) {
  if (definition.valueType === 'null') {
    return null;
  }

  if (definition.valueType === 'boolean') {
    const parsed = parseBooleanValue(rawValue);
    const value = parsed === null ? definition.defaultValue : parsed;
    return value ? 'true' : 'false';
  }

  if (definition.valueType === 'number') {
    let parsed = parseNumberValue(rawValue);
    if (parsed === null) {
      parsed = definition.defaultValue;
    }

    if (parsed === null) {
      return null;
    }

    if (definition.integer) {
      parsed = Math.trunc(parsed);
    }

    if (
      typeof definition.unlimitedValue === 'number' &&
      parsed === definition.unlimitedValue
    ) {
      return String(parsed);
    }

    if (typeof definition.min === 'number' && parsed < definition.min) {
      parsed = definition.min;
    }

    if (typeof definition.max === 'number' && parsed > definition.max) {
      parsed = definition.max;
    }

    return String(parsed);
  }

  const normalized = normalizeTextValue(rawValue);
  if (normalized !== null) {
    return normalized;
  }

  return definition.defaultValue;
}

export function normalizeManagedSubscriptionFeature(
  feature: ManagedSubscriptionFeatureDraft,
  options?: {
    targetScope?: SubscriptionTargetScope;
  }
) {
  const definition = getManagedDefinition(feature.featureKey);
  if (!definition) {
    return null;
  }

  if (options?.targetScope && definition.targetScope !== options.targetScope) {
    return null;
  }

  const featureValue = toStoredFeatureValue(definition, feature.featureValue);
  const valueLabel = definition.valueType === 'null'
    ? null
    : normalizeTextValue(feature.valueLabel) ?? featureValue;

  return {
    featureKey: definition.key,
    featureLabel: definition.label || normalizeLabel(feature.featureLabel),
    valueType: definition.valueType as SubscriptionFeatureValueType,
    featureValue,
    valueLabel,
    isPublic:
      typeof feature.isPublic === 'boolean'
        ? feature.isPublic
        : definition.isPublicByDefault
  };
}
