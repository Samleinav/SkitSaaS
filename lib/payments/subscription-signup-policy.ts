import { getAppConfigValueFromDb, trimToNull } from '@/lib/config/app-config';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';
import {
  getReservedBaselineSubscriptionTemplateIdForTargetType,
  isReservedBaselineSubscriptionTemplateId,
  isSubscriptionTemplateSelfServiceEligible
} from '@/lib/payments/subscription-default-templates';

export const SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE = 'signup.policy';

export const SUBSCRIPTION_FAILURE_FALLBACK_MODES = [
  'baseline',
  'public_free'
] as const;

export type SubscriptionFailureFallbackMode =
  (typeof SUBSCRIPTION_FAILURE_FALLBACK_MODES)[number];

type SubscriptionSignupPolicyDefinition = {
  configKey: string;
  envKey: string;
  fallback?: string;
};

const SUBSCRIPTION_SIGNUP_POLICY_DEFINITIONS = {
  signupDefaultUserTemplateId: {
    configKey: 'default_user_template_id',
    envKey: 'SIGNUP_DEFAULT_USER_TEMPLATE_ID'
  },
  signupDefaultOrganizationTemplateId: {
    configKey: 'default_organization_template_id',
    envKey: 'SIGNUP_DEFAULT_ORGANIZATION_TEMPLATE_ID'
  },
  publicFreeUserTemplateId: {
    configKey: 'public_free_user_template_id',
    envKey: 'SIGNUP_PUBLIC_FREE_USER_TEMPLATE_ID'
  },
  publicFreeOrganizationTemplateId: {
    configKey: 'public_free_organization_template_id',
    envKey: 'SIGNUP_PUBLIC_FREE_ORGANIZATION_TEMPLATE_ID'
  },
  subscriptionFailureFallbackMode: {
    configKey: 'subscription_failure_fallback_mode',
    envKey: 'SIGNUP_FAILURE_FALLBACK_MODE',
    fallback: 'baseline'
  }
} as const satisfies Record<string, SubscriptionSignupPolicyDefinition>;

export type SubscriptionSignupPolicyConfigName =
  keyof typeof SUBSCRIPTION_SIGNUP_POLICY_DEFINITIONS;

type SubscriptionTemplateCandidate = Awaited<
  ReturnType<typeof getSubscriptionTemplateById>
>;

export type ResolvedSubscriptionSignupPolicy = {
  signupDefaultUserTemplateId: number | null;
  signupDefaultOrganizationTemplateId: number | null;
  publicFreeUserTemplateId: number | null;
  publicFreeOrganizationTemplateId: number | null;
  subscriptionFailureFallbackMode: SubscriptionFailureFallbackMode;
};

export type SubscriptionSignupFlowMode =
  | 'baseline_direct'
  | 'direct'
  | 'paid_checkout_required';

function parsePositiveInt(value: string | null | undefined) {
  const normalized = trimToNull(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveTemplateScopeForTargetType(
  targetType: 'team' | 'user'
): SubscriptionTargetScope {
  return targetType === 'user' ? 'user' : 'organization';
}

export function normalizeSubscriptionFailureFallbackMode(
  value: string | null | undefined
): SubscriptionFailureFallbackMode {
  return value === 'public_free' ? 'public_free' : 'baseline';
}

export function getSubscriptionSignupPolicyDefinitions() {
  return SUBSCRIPTION_SIGNUP_POLICY_DEFINITIONS;
}

export function isSubscriptionSignupDefaultTemplateCandidate(
  template: SubscriptionTemplateCandidate,
  targetScope: SubscriptionTargetScope
) {
  return Boolean(
    template &&
      template.targetScope === targetScope &&
      isSubscriptionTemplateSelfServiceEligible(template)
  );
}

export function isSubscriptionPublicFreeFallbackTemplateCandidate(
  template: SubscriptionTemplateCandidate,
  targetScope: SubscriptionTargetScope
) {
  return Boolean(
    template &&
      template.priceCents === 0 &&
      isSubscriptionSignupDefaultTemplateCandidate(template, targetScope) &&
      !isReservedBaselineSubscriptionTemplateId(template.id)
  );
}

export async function getSubscriptionSignupPolicyValue(
  configName: SubscriptionSignupPolicyConfigName
) {
  const definition = SUBSCRIPTION_SIGNUP_POLICY_DEFINITIONS[configName];
  const envValue = trimToNull(process.env[definition.envKey]);
  if (envValue) {
    return envValue;
  }

  try {
    const dbValue = await getAppConfigValueFromDb(
      SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE,
      definition.configKey
    );
    if (dbValue) {
      return dbValue;
    }
  } catch {
    // If DB is unavailable, continue with fallback behavior.
  }

  return ('fallback' in definition ? definition.fallback : null) ?? null;
}

export async function getResolvedSubscriptionSignupPolicy(): Promise<ResolvedSubscriptionSignupPolicy> {
  const [
    signupDefaultUserTemplateId,
    signupDefaultOrganizationTemplateId,
    publicFreeUserTemplateId,
    publicFreeOrganizationTemplateId,
    subscriptionFailureFallbackMode
  ] = await Promise.all([
    getSubscriptionSignupPolicyValue('signupDefaultUserTemplateId'),
    getSubscriptionSignupPolicyValue('signupDefaultOrganizationTemplateId'),
    getSubscriptionSignupPolicyValue('publicFreeUserTemplateId'),
    getSubscriptionSignupPolicyValue('publicFreeOrganizationTemplateId'),
    getSubscriptionSignupPolicyValue('subscriptionFailureFallbackMode')
  ]);

  return {
    signupDefaultUserTemplateId: parsePositiveInt(signupDefaultUserTemplateId),
    signupDefaultOrganizationTemplateId: parsePositiveInt(
      signupDefaultOrganizationTemplateId
    ),
    publicFreeUserTemplateId: parsePositiveInt(publicFreeUserTemplateId),
    publicFreeOrganizationTemplateId: parsePositiveInt(
      publicFreeOrganizationTemplateId
    ),
    subscriptionFailureFallbackMode: normalizeSubscriptionFailureFallbackMode(
      subscriptionFailureFallbackMode
    )
  };
}

export async function getSubscriptionSignupDefaultTemplateForScope(
  targetScope: SubscriptionTargetScope
) {
  const policy = await getResolvedSubscriptionSignupPolicy();
  const templateId =
    targetScope === 'user'
      ? policy.signupDefaultUserTemplateId
      : policy.signupDefaultOrganizationTemplateId;

  if (!templateId) {
    return null;
  }

  const template = await getSubscriptionTemplateById(templateId);
  if (!isSubscriptionSignupDefaultTemplateCandidate(template, targetScope)) {
    return null;
  }

  return template;
}

export async function getSubscriptionPublicFreeFallbackTemplateForScope(
  targetScope: SubscriptionTargetScope
) {
  const policy = await getResolvedSubscriptionSignupPolicy();
  const templateId =
    targetScope === 'user'
      ? policy.publicFreeUserTemplateId
      : policy.publicFreeOrganizationTemplateId;

  if (!templateId) {
    return null;
  }

  const template = await getSubscriptionTemplateById(templateId);
  if (!isSubscriptionPublicFreeFallbackTemplateCandidate(template, targetScope)) {
    return null;
  }

  return template;
}

export async function getSubscriptionSignupFlowForScope(
  targetScope: SubscriptionTargetScope
) {
  const template = await getSubscriptionSignupDefaultTemplateForScope(targetScope);
  if (!template) {
    return {
      targetScope,
      mode: 'baseline_direct' as SubscriptionSignupFlowMode,
      template: null
    };
  }

  return {
    targetScope,
    mode:
      template.priceCents > 0
        ? ('paid_checkout_required' as SubscriptionSignupFlowMode)
        : ('direct' as SubscriptionSignupFlowMode),
    template
  };
}

export async function resolveSubscriptionFailureFallbackTemplateIdForTargetType(
  targetType: 'team' | 'user'
) {
  const policy = await getResolvedSubscriptionSignupPolicy();
  if (policy.subscriptionFailureFallbackMode === 'public_free') {
    const targetScope = resolveTemplateScopeForTargetType(targetType);
    const freeTemplate =
      await getSubscriptionPublicFreeFallbackTemplateForScope(targetScope);
    if (freeTemplate) {
      return freeTemplate.id;
    }
  }

  return getReservedBaselineSubscriptionTemplateIdForTargetType(targetType);
}
