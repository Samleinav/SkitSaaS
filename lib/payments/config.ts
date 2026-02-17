import { getAppConfigValueFromDb, trimToNull } from '@/lib/config/app-config';

type ConfigDefinition = {
  provider: 'stripe' | 'paypal';
  configKey: string;
  envKey: string;
  fallback?: string;
};

const PAYMENT_CONFIG_DEFINITIONS = {
  stripeEnabled: {
    provider: 'stripe',
    configKey: 'enabled',
    envKey: 'STRIPE_ENABLED',
    fallback: 'true'
  },
  stripeSecretKey: {
    provider: 'stripe',
    configKey: 'secret_key',
    envKey: 'STRIPE_SECRET_KEY'
  },
  stripeWebhookSecret: {
    provider: 'stripe',
    configKey: 'webhook_secret',
    envKey: 'STRIPE_WEBHOOK_SECRET'
  },
  paypalEnvironment: {
    provider: 'paypal',
    configKey: 'environment',
    envKey: 'PAYPAL_ENVIRONMENT',
    fallback: 'sandbox'
  },
  paypalEnabled: {
    provider: 'paypal',
    configKey: 'enabled',
    envKey: 'PAYPAL_ENABLED',
    fallback: 'true'
  },
  paypalClientId: {
    provider: 'paypal',
    configKey: 'client_id',
    envKey: 'PAYPAL_CLIENT_ID'
  },
  paypalClientSecret: {
    provider: 'paypal',
    configKey: 'client_secret',
    envKey: 'PAYPAL_CLIENT_SECRET'
  },
  paypalPublicClientId: {
    provider: 'paypal',
    configKey: 'public_client_id',
    envKey: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID'
  },
  paypalWebhookId: {
    provider: 'paypal',
    configKey: 'webhook_id',
    envKey: 'PAYPAL_WEBHOOK_ID'
  },
  paypalCurrency: {
    provider: 'paypal',
    configKey: 'currency',
    envKey: 'PAYPAL_CURRENCY',
    fallback: 'USD'
  }
} as const satisfies Record<string, ConfigDefinition>;

export type PaymentConfigName = keyof typeof PAYMENT_CONFIG_DEFINITIONS;

function getNonEmptyEnvValue(envKey: string) {
  return trimToNull(process.env[envKey]);
}

export async function getPaymentConfigValue(configName: PaymentConfigName) {
  const definition = PAYMENT_CONFIG_DEFINITIONS[configName];
  const envValue = getNonEmptyEnvValue(definition.envKey);
  if (envValue) {
    return envValue;
  }

  try {
    const dbValue = await getAppConfigValueFromDb(
      `payments.${definition.provider}`,
      definition.configKey
    );
    if (dbValue) {
      return dbValue;
    }
  } catch {
    // If DB is unavailable, continue with fallback behavior.
  }

  return ('fallback' in definition ? definition.fallback : undefined) ?? null;
}

export function getPaymentConfigDefinitionsForAdmin() {
  return PAYMENT_CONFIG_DEFINITIONS;
}
