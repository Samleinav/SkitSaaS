import { count, inArray } from '@skitsaas/sdk/db';
import { getDb } from '@skitsaas/sdk/server';
import {
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID,
  type EnterpriseProviderId
} from './constants';
import {
  evaluateEnterpriseOidcConfig,
  evaluateEnterpriseSamlConfig,
  getEnterpriseRuntimeConfig,
  type EnterpriseProviderStatus
} from './config';
import { authExternalIdentities } from '../db/schema';

export type EnterpriseProviderSummary = {
  tenantId: string;
  providerId: EnterpriseProviderId;
  status: EnterpriseProviderStatus;
  enabled: boolean;
  missingKeys: string[];
  loginAreas: string[];
  organizationIds: number[];
  domains: string[];
  connectionCount: number | null;
};

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
        inArray(authExternalIdentities.providerId, [
          AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
          AUTH_ENTERPRISE_SAML_PROVIDER_ID
        ])
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

export async function getEnterpriseProviderSummaries(): Promise<
  EnterpriseProviderSummary[]
> {
  const runtime = await getEnterpriseRuntimeConfig();
  const sharedCounts = await readConnectionCountByProvider();
  const summaries: EnterpriseProviderSummary[] = [];

  for (const tenantId of runtime.tenantIds) {
    const tenant = runtime.tenants[tenantId];
    if (!tenant) {
      continue;
    }

    const oidcHealth = evaluateEnterpriseOidcConfig(tenant.oidc);
    const samlHealth = evaluateEnterpriseSamlConfig(tenant.saml);

    const runtimeEnabled = runtime.enabled && tenant.enabled;

    summaries.push({
      tenantId,
      providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
      status: runtimeEnabled
        ? oidcHealth.status
        : 'disabled',
      enabled: runtimeEnabled && tenant.oidc.enabled,
      missingKeys: oidcHealth.missingKeys,
      loginAreas: tenant.loginAreas,
      organizationIds: tenant.organizationIds,
      domains: tenant.domains,
      connectionCount:
        sharedCounts?.get(AUTH_ENTERPRISE_OIDC_PROVIDER_ID) ?? null
    });

    summaries.push({
      tenantId,
      providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
      status: runtimeEnabled
        ? samlHealth.status
        : 'disabled',
      enabled: runtimeEnabled && tenant.saml.enabled,
      missingKeys: samlHealth.missingKeys,
      loginAreas: tenant.loginAreas,
      organizationIds: tenant.organizationIds,
      domains: tenant.domains,
      connectionCount:
        sharedCounts?.get(AUTH_ENTERPRISE_SAML_PROVIDER_ID) ?? null
    });
  }

  return summaries;
}

export async function getEnterpriseProviderSummary(
  providerId: EnterpriseProviderId,
  tenantId: string | null
) {
  const summaries = await getEnterpriseProviderSummaries();
  const filtered = summaries.filter((entry) => {
    if (entry.providerId !== providerId) {
      return false;
    }

    if (!tenantId) {
      return true;
    }

    return entry.tenantId === tenantId;
  });

  return filtered;
}
