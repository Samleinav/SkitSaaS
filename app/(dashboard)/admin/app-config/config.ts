import {
  getAllSubscriptionTemplatesForAdmin,
  getAppConfigEntriesForAdmin,
  getPaymentProviderConfigsForAdmin
} from '@/lib/db/queries.admin';
import { getEmailConfigDefinitionsForAdmin } from '@/lib/email/config';
import { getPaymentConfigDefinitionsForAdmin } from '@/lib/payments/config';
import {
  getSubscriptionSignupPolicyDefinitions,
  isSubscriptionSignupDefaultTemplateCandidate
} from '@/lib/payments/subscription-signup-policy';

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

type SignupPolicyConfigDefinition = {
  configKey: string;
  envKey: string;
  fallback?: string;
};

export type SignupPolicyConfigName = keyof ReturnType<
  typeof getSubscriptionSignupPolicyDefinitions
>;

export type SignupPolicyConfigRow = {
  configKey: string;
  envKey: string;
  value: string;
  dbValue: string;
  source: ConfigSource;
};

export type SignupPolicyTemplateOption = {
  id: number;
  name: string;
  targetScope: string;
  publicationStatus: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
  label: string;
};

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

function resolveSignupPolicyConfigRow({
  definition,
  dbConfigMap
}: {
  definition: SignupPolicyConfigDefinition;
  dbConfigMap: Map<string, string>;
}): SignupPolicyConfigRow {
  const envValue = process.env[definition.envKey]?.trim() || '';
  const dbValue =
    dbConfigMap.get(`signup.policy:${definition.configKey}`)?.trim() || '';

  if (envValue) {
    return {
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: envValue,
      dbValue,
      source: 'env'
    };
  }

  if (dbValue) {
    return {
      configKey: definition.configKey,
      envKey: definition.envKey,
      value: dbValue,
      dbValue,
      source: 'db'
    };
  }

  return {
    configKey: definition.configKey,
    envKey: definition.envKey,
    value: definition.fallback ?? '',
    dbValue: '',
    source: 'default'
  };
}

function formatTemplateOptionLabel({
  name,
  billingInterval,
  priceCents,
  currency,
  id
}: {
  name: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
  id: number;
}) {
  const amount = `${currency} ${(priceCents / 100).toFixed(2)}`;
  return `${name} (#${id}) - ${billingInterval} - ${amount}`;
}

export async function getAdminAppConfigData() {
  const dbConfigs = await getPaymentProviderConfigsForAdmin();
  const paymentDefinitions = getPaymentConfigDefinitionsForAdmin();
  const emailDefinitions = getEmailConfigDefinitionsForAdmin();
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

  return {
    paymentRowsByProvider,
    emailRows
  };
}

export async function getAdminSignupPolicyConfigData() {
  const [appConfigEntries, publishedTemplates] = await Promise.all([
    getAppConfigEntriesForAdmin(),
    getAllSubscriptionTemplatesForAdmin({
      includeReserved: true,
      publicationStatus: 'published'
    })
  ]);

  const dbConfigMap = new Map(
    appConfigEntries.map((config) => [
      `${config.namespace}:${config.configKey}`,
      config.configValue
    ])
  );

  const definitions = getSubscriptionSignupPolicyDefinitions();
  const signupPolicyRows = Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
      name,
      resolveSignupPolicyConfigRow({
        definition,
        dbConfigMap
      })
    ])
  ) as Record<SignupPolicyConfigName, SignupPolicyConfigRow>;

  const templateOptions = publishedTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    targetScope: template.targetScope,
    publicationStatus: template.publicationStatus,
    billingInterval: template.billingInterval,
    priceCents: template.priceCents,
    currency: template.currency,
    label: formatTemplateOptionLabel(template)
  }));

  const organizationTemplateOptions = templateOptions.filter(
    (template) =>
      isSubscriptionSignupDefaultTemplateCandidate(
        template,
        'organization'
      )
  );
  const userTemplateOptions = templateOptions.filter(
    (template) =>
      isSubscriptionSignupDefaultTemplateCandidate(template, 'user')
  );

  return {
    signupPolicyRows,
    organizationTemplateOptions,
    userTemplateOptions
  };
}
