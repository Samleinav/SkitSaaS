import { count, inArray } from '@skitsaas/sdk/db';
import { getDb } from '@skitsaas/sdk/server';
import {
  AUTH_SOCIAL_SUPPORTED_PROVIDERS,
  type SocialProviderId
} from './constants';
import {
  getSocialProviderConfig,
  type SocialProviderConfig
} from './config';
import { authExternalIdentities } from '../db/schema';

function isProviderReady(config: SocialProviderConfig) {
  return (
    config.enabled &&
    Boolean(config.clientId) &&
    Boolean(config.clientSecret) &&
    Boolean(config.authorizeUrl) &&
    Boolean(config.tokenUrl) &&
    Boolean(config.userInfoUrl)
  );
}

async function readConnectionCountByProvider() {
  try {
    const db = getDb<any>();
    const rows = await db
      .select({
        providerId: authExternalIdentities.providerId,
        count: count()
      })
      .from(authExternalIdentities)
      .where(
        inArray(authExternalIdentities.providerId, AUTH_SOCIAL_SUPPORTED_PROVIDERS)
      )
      .groupBy(authExternalIdentities.providerId);

    const byProvider = new Map<string, number>();
    for (const row of rows) {
      byProvider.set(String(row.providerId), Number(row.count) || 0);
    }

    return byProvider;
  } catch {
    return null;
  }
}

export type SocialProviderSummary = {
  providerId: SocialProviderId;
  displayName: string;
  status: 'disabled' | 'misconfigured' | 'ready';
  enabled: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  stateTtlSeconds: number;
  callbackBaseUrl: string | null;
  connectionCount: number | null;
  missingKeys: string[];
};

export async function getSocialProviderSummary(
  providerId: SocialProviderId
): Promise<SocialProviderSummary> {
  const config = await getSocialProviderConfig(providerId);
  const sharedCounts = await readConnectionCountByProvider();
  const missingKeys: string[] = [];
  if (!config.clientId) {
    missingKeys.push('client_id');
  }
  if (!config.clientSecret) {
    missingKeys.push('client_secret');
  }
  if (!config.authorizeUrl) {
    missingKeys.push('authorize_url');
  }
  if (!config.tokenUrl) {
    missingKeys.push('token_url');
  }
  if (!config.userInfoUrl) {
    missingKeys.push('user_info_url');
  }

  const ready = isProviderReady(config);

  return {
    providerId,
    displayName: config.displayName,
    status: ready ? 'ready' : config.enabled ? 'misconfigured' : 'disabled',
    enabled: config.enabled,
    clientIdSet: Boolean(config.clientId),
    clientSecretSet: Boolean(config.clientSecret),
    authorizeUrl: config.authorizeUrl,
    tokenUrl: config.tokenUrl,
    userInfoUrl: config.userInfoUrl,
    scopes: config.scopes,
    stateTtlSeconds: config.stateTtlSeconds,
    callbackBaseUrl: config.callbackBaseUrl,
    connectionCount: sharedCounts?.get(providerId) ?? null,
    missingKeys
  };
}

export async function getAllSocialProviderSummaries() {
  const sharedCounts = await readConnectionCountByProvider();
  const providers = await Promise.all(
    AUTH_SOCIAL_SUPPORTED_PROVIDERS.map(async (providerId) => {
      const config = await getSocialProviderConfig(providerId);
      const missingKeys: string[] = [];
      if (!config.clientId) {
        missingKeys.push('client_id');
      }
      if (!config.clientSecret) {
        missingKeys.push('client_secret');
      }
      if (!config.authorizeUrl) {
        missingKeys.push('authorize_url');
      }
      if (!config.tokenUrl) {
        missingKeys.push('token_url');
      }
      if (!config.userInfoUrl) {
        missingKeys.push('user_info_url');
      }

      const ready = isProviderReady(config);
      return {
        providerId,
        displayName: config.displayName,
        status: ready ? 'ready' : config.enabled ? 'misconfigured' : 'disabled',
        enabled: config.enabled,
        clientIdSet: Boolean(config.clientId),
        clientSecretSet: Boolean(config.clientSecret),
        authorizeUrl: config.authorizeUrl,
        tokenUrl: config.tokenUrl,
        userInfoUrl: config.userInfoUrl,
        scopes: config.scopes,
        stateTtlSeconds: config.stateTtlSeconds,
        callbackBaseUrl: config.callbackBaseUrl,
        connectionCount: sharedCounts?.get(providerId) ?? null,
        missingKeys
      } satisfies SocialProviderSummary;
    })
  );

  return providers;
}
