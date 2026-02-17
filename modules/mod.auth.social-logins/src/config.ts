import { getModuleConfigValue } from '@skitsaas/sdk/server';
import {
  AUTH_SOCIAL_LOGINS_MODULE_ID,
  AUTH_SOCIAL_SUPPORTED_PROVIDERS,
  type SocialProviderId
} from './constants';
import {
  getSocialProviderCatalogEntry,
  type SocialTokenAuthMethod
} from './provider-catalog';

const SOCIAL_NAMESPACE = `${AUTH_SOCIAL_LOGINS_MODULE_ID}.config`;
const DEFAULT_STATE_TTL_SECONDS = 600;

function toTrimmedString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function parseEnabled(value: string) {
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parsePositiveInt(value: string, fallback: number, minimumValue = 30) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < minimumValue) {
    return fallback;
  }

  return parsed;
}

function parseCsv(value: string) {
  if (!value) {
    return [] as string[];
  }

  const values: string[] = [];
  const seen = new Set<string>();
  for (const entry of value.split(',')) {
    const normalized = entry.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    values.push(normalized);
  }

  return values;
}

function parseTokenAuthMethod(
  value: string,
  fallback: SocialTokenAuthMethod
): SocialTokenAuthMethod {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'client_secret_basic') {
    return 'client_secret_basic';
  }

  if (normalized === 'client_secret_post') {
    return 'client_secret_post';
  }

  return fallback;
}

function toProviderEnvPrefix(providerId: SocialProviderId) {
  return `AUTH_SOCIAL_${providerId.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;
}

function readEnvValue(key: string) {
  return toTrimmedString(process.env[key]);
}

async function readConfigValue(configKey: string) {
  return (
    toTrimmedString(await getModuleConfigValue(SOCIAL_NAMESPACE, configKey)) || ''
  );
}

async function readValueWithEnvFallback({
  configKey,
  envKey
}: {
  configKey: string;
  envKey: string;
}) {
  const envValue = readEnvValue(envKey);
  if (envValue) {
    return envValue;
  }

  return readConfigValue(configKey);
}

async function readProviderValue(
  providerId: SocialProviderId,
  suffix: string,
  envSuffix: string
) {
  const envKey = `${toProviderEnvPrefix(providerId)}_${envSuffix}`;
  const configKey = `provider.${providerId}.${suffix}`;
  return readValueWithEnvFallback({
    configKey,
    envKey
  });
}

export type SocialRuntimeConfig = {
  stateTtlSeconds: number;
  callbackBaseUrl: string | null;
};

export async function getSocialRuntimeConfig(): Promise<SocialRuntimeConfig> {
  const [stateTtlRaw, callbackBaseUrlRaw] = await Promise.all([
    readValueWithEnvFallback({
      configKey: 'oauth_state_ttl_seconds',
      envKey: 'AUTH_SOCIAL_STATE_TTL_SECONDS'
    }),
    readValueWithEnvFallback({
      configKey: 'oauth_callback_base_url',
      envKey: 'AUTH_SOCIAL_CALLBACK_BASE_URL'
    })
  ]);

  return {
    stateTtlSeconds: parsePositiveInt(
      stateTtlRaw,
      DEFAULT_STATE_TTL_SECONDS,
      60
    ),
    callbackBaseUrl: callbackBaseUrlRaw || toTrimmedString(process.env.BASE_URL) || null
  };
}

export type SocialProviderConfig = {
  providerId: SocialProviderId;
  displayName: string;
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  emailInfoUrl: string | null;
  scopes: string[];
  usePkce: boolean;
  tokenAuthMethod: SocialTokenAuthMethod;
  stateTtlSeconds: number;
  callbackBaseUrl: string | null;
};

export async function getSocialProviderConfig(
  providerId: SocialProviderId
): Promise<SocialProviderConfig> {
  const defaults = getSocialProviderCatalogEntry(providerId);
  const runtime = await getSocialRuntimeConfig();

  const [
    enabledRaw,
    clientIdRaw,
    clientSecretRaw,
    authorizeUrlRaw,
    tokenUrlRaw,
    userInfoUrlRaw,
    emailInfoUrlRaw,
    scopesRaw,
    usePkceRaw,
    tokenAuthMethodRaw
  ] = await Promise.all([
    readProviderValue(providerId, 'enabled', 'ENABLED'),
    readProviderValue(providerId, 'client_id', 'CLIENT_ID'),
    readProviderValue(providerId, 'client_secret', 'CLIENT_SECRET'),
    readProviderValue(providerId, 'authorize_url', 'AUTHORIZE_URL'),
    readProviderValue(providerId, 'token_url', 'TOKEN_URL'),
    readProviderValue(providerId, 'user_info_url', 'USER_INFO_URL'),
    readProviderValue(providerId, 'email_info_url', 'EMAIL_INFO_URL'),
    readProviderValue(providerId, 'scopes', 'SCOPES'),
    readProviderValue(providerId, 'use_pkce', 'USE_PKCE'),
    readProviderValue(providerId, 'token_auth_method', 'TOKEN_AUTH_METHOD')
  ]);

  const scopes = parseCsv(scopesRaw);

  return {
    providerId,
    displayName: defaults.displayName,
    enabled: parseEnabled(enabledRaw),
    clientId: clientIdRaw || null,
    clientSecret: clientSecretRaw || null,
    authorizeUrl: authorizeUrlRaw || defaults.authorizeUrl,
    tokenUrl: tokenUrlRaw || defaults.tokenUrl,
    userInfoUrl: userInfoUrlRaw || defaults.userInfoUrl,
    emailInfoUrl: emailInfoUrlRaw || defaults.emailInfoUrl,
    scopes: scopes.length > 0 ? scopes : defaults.defaultScopes,
    usePkce: usePkceRaw ? parseEnabled(usePkceRaw) : defaults.defaultUsePkce,
    tokenAuthMethod: parseTokenAuthMethod(
      tokenAuthMethodRaw,
      defaults.tokenAuthMethod
    ),
    stateTtlSeconds: runtime.stateTtlSeconds,
    callbackBaseUrl: runtime.callbackBaseUrl
  };
}

export async function getAllSocialProviderConfigs() {
  return Promise.all(
    AUTH_SOCIAL_SUPPORTED_PROVIDERS.map((providerId) =>
      getSocialProviderConfig(providerId)
    )
  );
}
