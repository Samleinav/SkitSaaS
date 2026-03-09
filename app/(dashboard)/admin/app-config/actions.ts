'use server';

import {
  writeProviderConfig
} from '@/lib/config/app-config-writes';
import { getEmailConfigDefinitionsForAdmin } from '@/lib/email/config';
import { getPaymentConfigDefinitionsForAdmin } from '@/lib/payments/config';
import { getOrganizationConfigDefinitionsForAdmin } from '@/lib/organizations/config';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { adminAction, adminValidatedAction } from '../controller';
import {
  revalidateAdminAppConfig,
  revalidateAdminPayments,
  revalidateDashboard,
  revalidatePricing
} from '../actions/shared';
import { createAdminOrganizationControlsBuildFormBase } from './forms';
import {
  setModuleRuntimeStatusAction as _setModuleRuntimeStatusAction,
  upsertModuleRuntimeConfigAction as _upsertModuleRuntimeConfigAction
} from './modules/actions';

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

const adminOrganizationControlsBuildForm =
  createAdminOrganizationControlsBuildFormBase();

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

export const upsertOrganizationControlsAction = adminValidatedAction(
  adminOrganizationControlsBuildForm,
  async ({ user, values }) => {
    const allowMultiOrganizations = values.allowMultiOrganizations === true;
    const maxOrganizationsPerUser =
      typeof values.maxOrganizationsPerUser === 'number' &&
      Number.isInteger(values.maxOrganizationsPerUser) &&
      values.maxOrganizationsPerUser > 0
        ? values.maxOrganizationsPerUser
        : null;

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
