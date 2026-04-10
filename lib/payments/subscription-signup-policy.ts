import { getAppConfigValueFromDb, trimToNull } from '@/lib/config/app-config';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import type { SubscriptionTargetScope } from '@/lib/payments/subscription-scopes';
import {
  getReservedDefaultSubscriptionTemplateIdForScope,
  getReservedDefaultSubscriptionTemplateIdForTargetType,
  isSubscriptionTemplateSelfServiceEligible
} from '@/lib/payments/subscription-default-templates';

export const SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE = 'signup.policy';

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
  }
} as const satisfies Record<string, SubscriptionSignupPolicyDefinition>;

export type SubscriptionSignupPolicyConfigName =
  keyof typeof SUBSCRIPTION_SIGNUP_POLICY_DEFINITIONS;

type SubscriptionTemplateCandidate = {
  id: number;
  targetScope: string | null;
  publicationStatus?: string | null;
} | null;

export type ResolvedSubscriptionSignupPolicy = {
  signupDefaultUserTemplateId: number | null;
  signupDefaultOrganizationTemplateId: number | null;
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

export async function getSubscriptionSignupPolicyValue(
  configName: SubscriptionSignupPolicyConfigName
): Promise<string | null> {
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

  return null;
}

export async function getResolvedSubscriptionSignupPolicy(): Promise<ResolvedSubscriptionSignupPolicy> {
  const [
    signupDefaultUserTemplateId,
    signupDefaultOrganizationTemplateId
  ] = await Promise.all([
    getSubscriptionSignupPolicyValue('signupDefaultUserTemplateId'),
    getSubscriptionSignupPolicyValue('signupDefaultOrganizationTemplateId')
  ]);

  return {
    signupDefaultUserTemplateId: parsePositiveInt(signupDefaultUserTemplateId),
    signupDefaultOrganizationTemplateId: parsePositiveInt(
      signupDefaultOrganizationTemplateId
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

  if (templateId) {
    const template = await getSubscriptionTemplateById(templateId);
    if (isSubscriptionSignupDefaultTemplateCandidate(template, targetScope)) {
      return template;
    }
  }

  const defaultTemplateId =
    getReservedDefaultSubscriptionTemplateIdForScope(targetScope);
  const defaultTemplate = await getSubscriptionTemplateById(defaultTemplateId);
  if (
    isSubscriptionSignupDefaultTemplateCandidate(defaultTemplate, targetScope)
  ) {
    return defaultTemplate;
  }

  return null;
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
  return getReservedDefaultSubscriptionTemplateIdForTargetType(targetType);
}
