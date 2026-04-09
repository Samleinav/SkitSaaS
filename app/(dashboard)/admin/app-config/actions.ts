'use server';

import {
  deleteAppConfigEntry,
  upsertAppConfigEntry,
  writeProviderConfig
} from '@/lib/config/app-config-writes';
import { trimToNull } from '@/lib/config/app-config';
import { getSubscriptionTemplateById } from '@/lib/db/queries';
import { getEmailConfigDefinitionsForAdmin } from '@/lib/email/config';
import { getPaymentConfigDefinitionsForAdmin } from '@/lib/payments/config';
import {
  getSubscriptionSignupPolicyDefinitions,
  isSubscriptionPublicFreeFallbackTemplateCandidate,
  isSubscriptionSignupDefaultTemplateCandidate,
  normalizeSubscriptionFailureFallbackMode,
  SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE
} from '@/lib/payments/subscription-signup-policy';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { adminAction } from '../controller';
import {
  revalidateAuthPages,
  revalidateAdminAppConfig,
  revalidateAdminPayments,
  revalidateDashboard,
  revalidatePricing
} from '../actions/shared';
import {
  setModuleRuntimeStatusAction as _setModuleRuntimeStatusAction,
  upsertModuleRuntimeConfigAction as _upsertModuleRuntimeConfigAction
} from './modules/actions';

const paymentConfigDefinitions = Object.values(getPaymentConfigDefinitionsForAdmin());
const emailConfigDefinitions = Object.values(getEmailConfigDefinitionsForAdmin());
const paymentProviders = new Set<string>(
  paymentConfigDefinitions.map((definition) => definition.provider)
);
const emailProviders = new Set<string>(
  emailConfigDefinitions.map((definition) => definition.provider)
);

const appConfigKeysByProvider = [
  ...paymentConfigDefinitions,
  ...emailConfigDefinitions
].reduce<Map<string, Set<string>>>((accumulator, definition) => {
  const providerKeys =
    accumulator.get(definition.provider) ?? new Set<string>();
  providerKeys.add(definition.configKey);
  accumulator.set(definition.provider, providerKeys);
  return accumulator;
}, new Map());

function hasAllowedAppConfigKey({
  provider,
  configKey
}: {
  provider: string;
  configKey: string;
}) {
  return appConfigKeysByProvider.get(provider)?.has(configKey) ?? false;
}

const subscriptionSignupPolicyDefinitions = getSubscriptionSignupPolicyDefinitions();

function parsePositiveIntOrNull(value: string) {
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

export const upsertPaymentProviderConfigAction = adminAction(
  async ({ user, form }) => {
    const provider = form.lower('provider');
    const configKey = form.string('configKey');
    const configValue = form.string('configValue');

    if (!provider || !configKey) {
      return false;
    }

    if (!hasAllowedAppConfigKey({ provider, configKey })) {
      return false;
    }

    await writeProviderConfig({
      provider,
      configKey,
      configValue
    });

    const payload = { provider, configKey, configValue };
    const context = {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      source: '/admin/app-config'
    };

    await emitEventAsync(EVENT_HOOKS.adminAppConfigUpdated, payload, context);

    if (paymentProviders.has(provider)) {
      await emitEventAsync(
        EVENT_HOOKS.adminPaymentsConfigUpdated,
        payload,
        context
      );
    }

    if (emailProviders.has(provider)) {
      await emitEventAsync(
        EVENT_HOOKS.adminEmailConfigUpdated,
        payload,
        context
      );
    }
  },
  {
    revalidate: [
      revalidateAdminAppConfig,
      revalidateAdminPayments,
      revalidateDashboard,
      revalidatePricing
    ]
  }
);

export async function setModuleRuntimeStatusAction(formData: FormData) {
  return _setModuleRuntimeStatusAction(formData);
}

export async function upsertModuleRuntimeConfigAction(formData: FormData) {
  return _upsertModuleRuntimeConfigAction(formData);
}

export const upsertProviderConfigBatchAction = adminAction(
  async ({ user, form, formData }) => {
    const provider = form.lower('provider');
    const allowedConfigKeys = appConfigKeysByProvider.get(provider);

    if (!allowedConfigKeys) {
      return false;
    }

    const updates: Array<{ configKey: string; configValue: string }> = [];

    for (const configKey of allowedConfigKeys) {
      const fieldName = `configValues.${configKey}`;
      if (!formData.has(fieldName)) {
        continue;
      }

      updates.push({
        configKey,
        configValue: form.string(fieldName)
      });
    }

    if (updates.length === 0) {
      return false;
    }

    for (const update of updates) {
      await writeProviderConfig({
        provider,
        configKey: update.configKey,
        configValue: update.configValue
      });
    }

    const payload = {
      provider,
      updates
    };
    const context = {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      source: '/admin/app-config'
    };

    await emitEventAsync(EVENT_HOOKS.adminAppConfigUpdated, payload, context);

    if (paymentProviders.has(provider)) {
      await emitEventAsync(
        EVENT_HOOKS.adminPaymentsConfigUpdated,
        payload,
        context
      );
    }

    if (emailProviders.has(provider)) {
      await emitEventAsync(
        EVENT_HOOKS.adminEmailConfigUpdated,
        payload,
        context
      );
    }
  },
  {
    revalidate: [
      revalidateAdminAppConfig,
      revalidateAdminPayments,
      revalidateDashboard,
      revalidatePricing
    ]
  }
);

export const upsertSignupPolicyConfigAction = adminAction(
  async ({ user, form }) => {
    const updates = [
      {
        definition:
          subscriptionSignupPolicyDefinitions.signupDefaultOrganizationTemplateId,
        rawValue: form.string('signupDefaultOrganizationTemplateId'),
        validate: (template: Awaited<ReturnType<typeof getSubscriptionTemplateById>>) =>
          isSubscriptionSignupDefaultTemplateCandidate(template, 'organization')
      },
      {
        definition:
          subscriptionSignupPolicyDefinitions.signupDefaultUserTemplateId,
        rawValue: form.string('signupDefaultUserTemplateId'),
        validate: (template: Awaited<ReturnType<typeof getSubscriptionTemplateById>>) =>
          isSubscriptionSignupDefaultTemplateCandidate(template, 'user')
      },
      {
        definition:
          subscriptionSignupPolicyDefinitions.publicFreeOrganizationTemplateId,
        rawValue: form.string('publicFreeOrganizationTemplateId'),
        validate: (template: Awaited<ReturnType<typeof getSubscriptionTemplateById>>) =>
          isSubscriptionPublicFreeFallbackTemplateCandidate(template, 'organization')
      },
      {
        definition: subscriptionSignupPolicyDefinitions.publicFreeUserTemplateId,
        rawValue: form.string('publicFreeUserTemplateId'),
        validate: (template: Awaited<ReturnType<typeof getSubscriptionTemplateById>>) =>
          isSubscriptionPublicFreeFallbackTemplateCandidate(template, 'user')
      }
    ] as const;

    for (const update of updates) {
      const templateId = parsePositiveIntOrNull(update.rawValue);
      if (templateId === null) {
        await deleteAppConfigEntry({
          namespace: SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE,
          configKey: update.definition.configKey
        });
        continue;
      }

      const template = await getSubscriptionTemplateById(templateId);
      if (!update.validate(template)) {
        return false;
      }

      await upsertAppConfigEntry({
        namespace: SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE,
        configKey: update.definition.configKey,
        configValue: String(templateId),
        isSecret: false
      });
    }

    const fallbackMode = normalizeSubscriptionFailureFallbackMode(
      form.string('subscriptionFailureFallbackMode')
    );
    await upsertAppConfigEntry({
      namespace: SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE,
      configKey:
        subscriptionSignupPolicyDefinitions.subscriptionFailureFallbackMode.configKey,
      configValue: fallbackMode,
      isSecret: false
    });

    const payload = {
      namespace: SUBSCRIPTION_SIGNUP_POLICY_NAMESPACE,
      settings: {
        signupDefaultOrganizationTemplateId: parsePositiveIntOrNull(
          form.string('signupDefaultOrganizationTemplateId')
        ),
        signupDefaultUserTemplateId: parsePositiveIntOrNull(
          form.string('signupDefaultUserTemplateId')
        ),
        publicFreeOrganizationTemplateId: parsePositiveIntOrNull(
          form.string('publicFreeOrganizationTemplateId')
        ),
        publicFreeUserTemplateId: parsePositiveIntOrNull(
          form.string('publicFreeUserTemplateId')
        ),
        subscriptionFailureFallbackMode: fallbackMode
      }
    };

    await emitEventAsync(EVENT_HOOKS.adminAppConfigUpdated, payload, {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      source: '/admin/app-config/subscriptions'
    });
  },
  {
    revalidate: [
      revalidateAdminAppConfig,
      revalidateDashboard,
      revalidatePricing,
      revalidateAuthPages
    ]
  }
);
