'use server';

import {
  writeProviderConfig
} from '@/lib/config/app-config-writes';
import { getEmailConfigDefinitionsForAdmin } from '@/lib/email/config';
import { getPaymentConfigDefinitionsForAdmin } from '@/lib/payments/config';
import { getOrganizationConfigDefinitionsForAdmin } from '@/lib/organizations/config';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { adminAction } from '../controller';
import {
  revalidateAdminAppConfig,
  revalidateAdminPayments,
  revalidateDashboard,
  revalidatePricing
} from '../actions/shared';

const organizationConfigDefinitions = getOrganizationConfigDefinitionsForAdmin();
const organizationProvider =
  organizationConfigDefinitions.allowMultiOrganizations.provider;
const allowMultiOrganizationsKey =
  organizationConfigDefinitions.allowMultiOrganizations.configKey;
const maxOrganizationsPerUserKey =
  organizationConfigDefinitions.maxOrganizationsPerUser.configKey;
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

function parseBooleanInput(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
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

export const upsertOrganizationControlsAction = adminAction(
  async ({ user, form }) => {
    const allowMultiOrganizations = parseBooleanInput(
      form.string('allowMultiOrganizations')
    );
    const maxOrganizationsPerUserRaw = form.string('maxOrganizationsPerUser');

    let maxOrganizationsPerUser: number | null = null;
    if (maxOrganizationsPerUserRaw) {
      const parsedMax = Number(maxOrganizationsPerUserRaw);
      if (!Number.isInteger(parsedMax) || parsedMax <= 0) {
        return false;
      }

      maxOrganizationsPerUser = parsedMax;
    }

    await writeProviderConfig({
      provider: organizationProvider,
      configKey: allowMultiOrganizationsKey,
      configValue: allowMultiOrganizations ? 'true' : 'false'
    });

    await writeProviderConfig({
      provider: organizationProvider,
      configKey: maxOrganizationsPerUserKey,
      configValue:
        allowMultiOrganizations && maxOrganizationsPerUser
          ? String(maxOrganizationsPerUser)
          : ''
    });

    await emitEventAsync(
      EVENT_HOOKS.adminAppConfigUpdated,
      {
        provider: organizationProvider,
        updates: [
          {
            configKey: allowMultiOrganizationsKey,
            configValue: allowMultiOrganizations ? 'true' : 'false'
          },
          {
            configKey: maxOrganizationsPerUserKey,
            configValue:
              allowMultiOrganizations && maxOrganizationsPerUser
                ? String(maxOrganizationsPerUser)
                : ''
          }
        ]
      },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        source: '/admin/app-config'
      }
    );
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
