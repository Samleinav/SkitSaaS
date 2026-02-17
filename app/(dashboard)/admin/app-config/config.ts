import { getPaymentProviderConfigsForAdmin } from '@/lib/db/queries';
import { getEmailConfigDefinitionsForAdmin } from '@/lib/email/config';
import { getOrganizationConfigDefinitionsForAdmin } from '@/lib/organizations/config';
import { getPaymentConfigDefinitionsForAdmin } from '@/lib/payments/config';

export type ConfigSource = 'env' | 'db' | 'default';

type ConfigDefinition = {
  provider: string;
  configKey: string;
  envKey: string;
  fallback?: string;
};

export type ConfigRow = {
  provider: string;
  configKey: string;
  envKey: string;
  value: string;
  dbValue: string;
  source: ConfigSource;
};

export type ProviderId = 'stripe' | 'paypal';

export const PROVIDER_ORDER: ProviderId[] = ['stripe', 'paypal'];

function resolveConfigRow({
  definition,
  dbConfigMap
}: {
  definition: ConfigDefinition;
  dbConfigMap: Map<string, string>;
}): ConfigRow {
  const envValue = process.env[definition.envKey]?.trim() || '';
  const dbValue =
    dbConfigMap.get(`${definition.provider}:${definition.configKey}`)?.trim() ||
    '';

  if (envValue) {
    return {
      provider: definition.provider,
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: envValue,
      dbValue,
      source: 'env'
    };
  }

  if (dbValue) {
    return {
      provider: definition.provider,
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: dbValue,
      dbValue,
      source: 'db'
    };
  }

  return {
    provider: definition.provider,
    configKey: definition.configKey,
    envKey: definition.envKey,
    value: ('fallback' in definition ? definition.fallback : '') || '',
    dbValue: '',
    source: 'default'
  };
}

export function parseBooleanConfigValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

export function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function getAdminAppConfigData() {
  const dbConfigs = await getPaymentProviderConfigsForAdmin();
  const paymentDefinitions = getPaymentConfigDefinitionsForAdmin();
  const emailDefinitions = getEmailConfigDefinitionsForAdmin();
  const organizationDefinitions = getOrganizationConfigDefinitionsForAdmin();
  const dbConfigMap = new Map(
    dbConfigs.map((config) => [`${config.provider}:${config.configKey}`, config.configValue])
  );

  const paymentRows: ConfigRow[] = Object.values(paymentDefinitions).map(
    (definition) =>
      resolveConfigRow({
        definition,
        dbConfigMap
      })
  );

  const emailRows: ConfigRow[] = Object.values(emailDefinitions).map(
    (definition) =>
      resolveConfigRow({
        definition,
        dbConfigMap
      })
  );

  const paymentRowsByProvider = paymentRows.reduce<Record<ProviderId, ConfigRow[]>>(
    (accumulator, row) => {
      const provider = row.provider as ProviderId;
      if (!accumulator[provider]) {
        accumulator[provider] = [];
      }
      accumulator[provider].push(row);
      return accumulator;
    },
    { stripe: [], paypal: [] }
  );

  const organizationAllowMultiConfig = resolveConfigRow({
    definition: organizationDefinitions.allowMultiOrganizations,
    dbConfigMap
  });
  const organizationMaxConfig = resolveConfigRow({
    definition: organizationDefinitions.maxOrganizationsPerUser,
    dbConfigMap
  });

  return {
    paymentRowsByProvider,
    emailRows,
    organizationAllowMultiConfig,
    organizationMaxConfig,
    allowMultiOrganizations: parseBooleanConfigValue(
      organizationAllowMultiConfig.value
    ),
    maxOrganizationsPerUser: parsePositiveInteger(organizationMaxConfig.value)
  };
}
