import { getModuleConfigValue } from '@skitsaas/sdk/server';

function trimToNull(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function readConfigValue({
  envKey,
  namespace,
  configKey
}: {
  envKey: string;
  namespace: string;
  configKey: string;
}) {
  const envValue = trimToNull(process.env[envKey]);
  if (envValue) {
    return envValue;
  }

  try {
    return trimToNull(await getModuleConfigValue(namespace, configKey));
  } catch {
    return null;
  }
}

export async function getStripeSecretKeyForOneTimePayments() {
  return readConfigValue({
    envKey: 'STRIPE_SECRET_KEY',
    namespace: 'payments.stripe',
    configKey: 'secret_key'
  });
}

export async function getStripeWebhookSecretForOneTimePayments() {
  return readConfigValue({
    envKey: 'STRIPE_WEBHOOK_SECRET',
    namespace: 'payments.stripe',
    configKey: 'webhook_secret'
  });
}

export async function isStripeEnabledForOneTimePayments() {
  const [enabledValue, secretKey] = await Promise.all([
    readConfigValue({
      envKey: 'STRIPE_ENABLED',
      namespace: 'payments.stripe',
      configKey: 'enabled'
    }),
    getStripeSecretKeyForOneTimePayments()
  ]);

  const enabled = enabledValue?.toLowerCase();
  if (
    enabled === 'false' ||
    enabled === '0' ||
    enabled === 'no' ||
    enabled === 'off'
  ) {
    return false;
  }

  return Boolean(secretKey);
}

function normalizeBooleanConfig(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  ) {
    return true;
  }

  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'off'
  ) {
    return false;
  }

  return null;
}

function normalizePayPalEnvironment(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'production' || normalized === 'live') {
    return 'production' as const;
  }

  return 'sandbox' as const;
}

type PayPalTokenCache = {
  cacheKey: string;
  accessToken: string;
  expiresAt: number;
};

let payPalAccessTokenCache: PayPalTokenCache | null = null;

export async function getPayPalEnvironmentForOneTimePayments() {
  const configuredEnvironment = await readConfigValue({
    envKey: 'PAYPAL_ENVIRONMENT',
    namespace: 'payments.paypal',
    configKey: 'environment'
  });

  return normalizePayPalEnvironment(configuredEnvironment);
}

export async function getPayPalApiBaseUrlForOneTimePayments() {
  return (await getPayPalEnvironmentForOneTimePayments()) === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function getPayPalClientIdForOneTimePayments() {
  return readConfigValue({
    envKey: 'PAYPAL_CLIENT_ID',
    namespace: 'payments.paypal',
    configKey: 'client_id'
  });
}

export async function getPayPalClientSecretForOneTimePayments() {
  return readConfigValue({
    envKey: 'PAYPAL_CLIENT_SECRET',
    namespace: 'payments.paypal',
    configKey: 'client_secret'
  });
}

export async function getPayPalWebhookIdForOneTimePayments() {
  return readConfigValue({
    envKey: 'PAYPAL_WEBHOOK_ID',
    namespace: 'payments.paypal',
    configKey: 'webhook_id'
  });
}

export async function isPayPalEnabledForOneTimePayments() {
  const [enabledValue, clientId, clientSecret] = await Promise.all([
    readConfigValue({
      envKey: 'PAYPAL_ENABLED',
      namespace: 'payments.paypal',
      configKey: 'enabled'
    }),
    getPayPalClientIdForOneTimePayments(),
    getPayPalClientSecretForOneTimePayments()
  ]);

  const normalizedEnabled = normalizeBooleanConfig(enabledValue);
  if (normalizedEnabled === false) {
    return false;
  }

  return Boolean(clientId && clientSecret);
}

export async function getPayPalAccessTokenForOneTimePayments() {
  const [clientId, clientSecret, apiBaseUrl] = await Promise.all([
    getPayPalClientIdForOneTimePayments(),
    getPayPalClientSecretForOneTimePayments(),
    getPayPalApiBaseUrlForOneTimePayments()
  ]);

  if (!clientId || !clientSecret) {
    return null;
  }

  const cacheKey = `${apiBaseUrl}:${clientId}:${clientSecret}`;
  const now = Date.now();
  if (payPalAccessTokenCache) {
    const isCacheValid =
      payPalAccessTokenCache.cacheKey === cacheKey &&
      payPalAccessTokenCache.expiresAt > now + 30_000;
    if (isCacheValid) {
      return payPalAccessTokenCache.accessToken;
    }
  }

  try {
    const authToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    );
    const response = await fetch(`${apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!response.ok) {
      return null;
    }

    const body = (await response.json().catch(() => null)) as
      | {
          access_token?: string;
          expires_in?: number;
        }
      | null;
    const accessToken = trimToNull(body?.access_token);
    if (!accessToken) {
      return null;
    }

    const expiresInSeconds =
      typeof body?.expires_in === 'number' && body.expires_in > 0
        ? body.expires_in
        : 300;
    payPalAccessTokenCache = {
      cacheKey,
      accessToken,
      expiresAt: now + expiresInSeconds * 1000
    };

    return accessToken;
  } catch {
    return null;
  }
}
