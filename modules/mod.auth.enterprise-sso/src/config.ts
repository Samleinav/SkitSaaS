import { getModuleConfigValue } from '@skitsaas/sdk/server';
import {
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID,
  AUTH_ENTERPRISE_SSO_MODULE_ID,
  ENTERPRISE_AUTH_AREAS,
  type EnterpriseAuthArea,
  type EnterpriseProviderId,
  ENTERPRISE_USER_ROLES,
  type EnterpriseUserRole
} from './constants';

const ENTERPRISE_NAMESPACE = `${AUTH_ENTERPRISE_SSO_MODULE_ID}.config`;
const DEFAULT_STATE_TTL_SECONDS = 600;
const DEFAULT_SAML_CLOCK_SKEW_SECONDS = 120;
const DEFAULT_OIDC_SCOPES = ['openid', 'email', 'profile'];
const TENANT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const metadataCache = new Map<string, Promise<string | null>>();

function toTrimmedString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function toLowerString(value: string | null | undefined) {
  return toTrimmedString(value).toLowerCase();
}

function parseEnabled(value: string, fallbackValue = false) {
  const normalized = toLowerString(value);
  if (!normalized) {
    return fallbackValue;
  }

  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
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

  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of value.split(',')) {
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    values.push(normalized);
  }

  return values;
}

function normalizeTenantId(value: string) {
  const normalized = toLowerString(value);
  if (!normalized || !TENANT_ID_PATTERN.test(normalized)) {
    return '';
  }

  return normalized;
}

function normalizeCertificateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '')
    .trim();

  return normalized || null;
}

function parseRoleMap(value: string) {
  if (!value) {
    return {} as Record<string, EnterpriseUserRole>;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const output: Record<string, EnterpriseUserRole> = {};
    for (const [rawKey, rawRole] of Object.entries(parsed)) {
      const key = toLowerString(rawKey);
      const role = toLowerString(String(rawRole));
      if (!key) {
        continue;
      }

      if (
        role === 'member' ||
        role === 'admin' ||
        role === 'owner'
      ) {
        output[key] = role;
      }
    }

    return output;
  } catch {
    return {};
  }
}

function parseOrganizationIds(value: string) {
  if (!value) {
    return [] as number[];
  }

  const ids = new Set<number>();
  for (const entry of parseCsv(value)) {
    const parsed = Number.parseInt(entry, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      continue;
    }

    ids.add(parsed);
  }

  return Array.from(ids.values()).sort((left, right) => left - right);
}

function parseLoginAreas(value: string) {
  const allowed = new Set<EnterpriseAuthArea>();
  for (const entry of parseCsv(value)) {
    const normalized = toLowerString(entry);
    if (
      ENTERPRISE_AUTH_AREAS.includes(normalized as EnterpriseAuthArea)
    ) {
      allowed.add(normalized as EnterpriseAuthArea);
    }
  }

  if (!allowed.size) {
    return ['dashboard', 'admin'] as EnterpriseAuthArea[];
  }

  return Array.from(allowed.values());
}

function parseAllowedRoleTargets(value: string) {
  const roles = new Set<EnterpriseUserRole>();
  for (const entry of parseCsv(value)) {
    const normalized = toLowerString(entry);
    if (
      ENTERPRISE_USER_ROLES.includes(normalized as EnterpriseUserRole)
    ) {
      roles.add(normalized as EnterpriseUserRole);
    }
  }

  if (!roles.size) {
    return ['member', 'admin'] as EnterpriseUserRole[];
  }

  return Array.from(roles.values());
}

function toTenantEnvPrefix(tenantId: string) {
  return `AUTH_ENTERPRISE_SSO_${tenantId
    .replace(/[^a-z0-9]+/gi, '_')
    .toUpperCase()}`;
}

function readEnvValue(key: string) {
  return toTrimmedString(process.env[key]);
}

async function readConfigValue(configKey: string) {
  return toTrimmedString(
    await getModuleConfigValue(ENTERPRISE_NAMESPACE, configKey)
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

async function readTenantValue(
  tenantId: string,
  configSuffix: string,
  envSuffix: string
) {
  const envKey = `${toTenantEnvPrefix(tenantId)}_${envSuffix}`;
  const configKey = `tenant.${tenantId}.${configSuffix}`;
  return readValueWithEnvFallback({
    configKey,
    envKey
  });
}

async function readMetadataFromUrl(url: string) {
  const normalized = toTrimmedString(url);
  if (!normalized) {
    return null;
  }

  const cached = metadataCache.get(normalized);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    try {
      const response = await fetch(normalized, {
        method: 'GET',
        headers: {
          accept: 'application/samlmetadata+xml, application/xml, text/xml'
        }
      });
      if (!response.ok) {
        return null;
      }

      const xml = toTrimmedString(await response.text());
      return xml || null;
    } catch {
      return null;
    }
  })();

  metadataCache.set(normalized, pending);
  return pending;
}

function readFirstMatch(source: string, pattern: RegExp) {
  const match = pattern.exec(source);
  if (!match) {
    return null;
  }

  return toTrimmedString(match[1] ?? '') || null;
}

export type SamlMetadataSummary = {
  idpEntityId: string | null;
  ssoUrl: string | null;
  x509Cert: string | null;
};

export function parseSamlMetadata(xml: string): SamlMetadataSummary {
  const normalized = toTrimmedString(xml);
  if (!normalized) {
    return {
      idpEntityId: null,
      ssoUrl: null,
      x509Cert: null
    };
  }

  const idpEntityId = readFirstMatch(
    normalized,
    /<\w*:EntityDescriptor[^>]*\bentityID="([^"]+)"/i
  );
  const ssoUrl = readFirstMatch(
    normalized,
    /<\w*:SingleSignOnService[^>]*\bLocation="([^"]+)"/i
  );
  const x509CertRaw = readFirstMatch(
    normalized,
    /<\w*:X509Certificate[^>]*>([\s\S]*?)<\/\w*:X509Certificate>/i
  );

  return {
    idpEntityId,
    ssoUrl,
    x509Cert: normalizeCertificateValue(x509CertRaw)
  };
}

export type EnterpriseRoleMappingPolicy = {
  allowJitProvisioning: boolean;
  allowEmailLinking: boolean;
  requireVerifiedEmail: boolean;
  allowRoleSync: boolean;
  allowRoleElevation: boolean;
  allowedRoleTargets: EnterpriseUserRole[];
  subjectClaimPath: string;
  emailClaimPath: string;
  emailVerifiedClaimPath: string;
  displayNameClaimPath: string;
  roleClaimPath: string;
  groupsClaimPath: string;
  roleMap: Record<string, EnterpriseUserRole>;
  groupMap: Record<string, EnterpriseUserRole>;
};

export type EnterpriseOidcProviderConfig = {
  providerId: typeof AUTH_ENTERPRISE_OIDC_PROVIDER_ID;
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string | null;
  issuer: string | null;
  jwksUrl: string | null;
  scopes: string[];
  usePkce: boolean;
  verifyIdToken: boolean;
  stateTtlSeconds: number;
  callbackBaseUrl: string | null;
};

export type EnterpriseSamlProviderConfig = {
  providerId: typeof AUTH_ENTERPRISE_SAML_PROVIDER_ID;
  enabled: boolean;
  entityId: string | null;
  idpEntityId: string | null;
  ssoUrl: string | null;
  x509Cert: string | null;
  expectedAudience: string | null;
  stateTtlSeconds: number;
  callbackBaseUrl: string | null;
  clockSkewSeconds: number;
  metadataUrl: string | null;
  metadataLoaded: boolean;
};

export type EnterpriseTenantConfig = {
  tenantId: string;
  enabled: boolean;
  domains: string[];
  organizationIds: number[];
  loginAreas: EnterpriseAuthArea[];
  roleMapping: EnterpriseRoleMappingPolicy;
  oidc: EnterpriseOidcProviderConfig;
  saml: EnterpriseSamlProviderConfig;
};

export type EnterpriseRuntimeConfig = {
  enabled: boolean;
  defaultTenant: string | null;
  tenantIds: string[];
  callbackBaseUrl: string | null;
  stateTtlSeconds: number;
  tenants: Record<string, EnterpriseTenantConfig>;
};

export type EnterpriseProviderStatus = 'disabled' | 'misconfigured' | 'ready';

export function evaluateEnterpriseOidcConfig(config: EnterpriseOidcProviderConfig) {
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
  if (!config.callbackBaseUrl) {
    missingKeys.push('callback_base_url');
  }

  if (config.verifyIdToken) {
    if (!config.issuer) {
      missingKeys.push('issuer');
    }
    if (!config.jwksUrl) {
      missingKeys.push('jwks_url');
    }
  } else if (!config.userInfoUrl) {
    missingKeys.push('user_info_url');
  }

  const status: EnterpriseProviderStatus = !config.enabled
    ? 'disabled'
    : missingKeys.length > 0
      ? 'misconfigured'
      : 'ready';

  return {
    status,
    missingKeys
  };
}

export function evaluateEnterpriseSamlConfig(config: EnterpriseSamlProviderConfig) {
  const missingKeys: string[] = [];

  if (!config.entityId) {
    missingKeys.push('entity_id');
  }
  if (!config.idpEntityId) {
    missingKeys.push('idp_entity_id');
  }
  if (!config.ssoUrl) {
    missingKeys.push('sso_url');
  }
  if (!config.x509Cert) {
    missingKeys.push('x509_cert');
  }
  if (!config.callbackBaseUrl) {
    missingKeys.push('callback_base_url');
  }

  const status: EnterpriseProviderStatus = !config.enabled
    ? 'disabled'
    : missingKeys.length > 0
      ? 'misconfigured'
      : 'ready';

  return {
    status,
    missingKeys
  };
}

function resolveDomainList(value: string) {
  return parseCsv(value)
    .map((entry) => toLowerString(entry))
    .filter((entry) => entry.length > 0);
}

async function readTenantConfig({
  tenantId,
  runtimeCallbackBaseUrl,
  runtimeStateTtlSeconds
}: {
  tenantId: string;
  runtimeCallbackBaseUrl: string | null;
  runtimeStateTtlSeconds: number;
}): Promise<EnterpriseTenantConfig> {
  const [
    tenantEnabledRaw,
    domainsRaw,
    organizationIdsRaw,
    loginAreasRaw,
    allowJitRaw,
    allowEmailLinkingRaw,
    requireVerifiedEmailRaw,
    allowRoleSyncRaw,
    allowRoleElevationRaw,
    allowedRoleTargetsRaw,
    subjectClaimPathRaw,
    emailClaimPathRaw,
    emailVerifiedClaimPathRaw,
    displayNameClaimPathRaw,
    roleClaimPathRaw,
    groupsClaimPathRaw,
    roleMapRaw,
    groupMapRaw,
    oidcEnabledRaw,
    oidcClientIdRaw,
    oidcClientSecretRaw,
    oidcAuthorizeUrlRaw,
    oidcTokenUrlRaw,
    oidcUserInfoUrlRaw,
    oidcIssuerRaw,
    oidcJwksUrlRaw,
    oidcScopesRaw,
    oidcUsePkceRaw,
    oidcVerifyIdTokenRaw,
    oidcStateTtlRaw,
    oidcCallbackBaseUrlRaw,
    samlEnabledRaw,
    samlEntityIdRaw,
    samlIdpEntityIdRaw,
    samlSsoUrlRaw,
    samlX509CertRaw,
    samlExpectedAudienceRaw,
    samlStateTtlRaw,
    samlClockSkewRaw,
    samlCallbackBaseUrlRaw,
    samlMetadataUrlRaw,
    samlMetadataXmlRaw
  ] = await Promise.all([
    readTenantValue(tenantId, 'enabled', 'ENABLED'),
    readTenantValue(tenantId, 'domains', 'DOMAINS'),
    readTenantValue(tenantId, 'organization_ids', 'ORGANIZATION_IDS'),
    readTenantValue(tenantId, 'login_areas', 'LOGIN_AREAS'),
    readTenantValue(tenantId, 'allow_jit_provisioning', 'ALLOW_JIT_PROVISIONING'),
    readTenantValue(tenantId, 'allow_email_linking', 'ALLOW_EMAIL_LINKING'),
    readTenantValue(tenantId, 'require_verified_email', 'REQUIRE_VERIFIED_EMAIL'),
    readTenantValue(tenantId, 'allow_role_sync', 'ALLOW_ROLE_SYNC'),
    readTenantValue(tenantId, 'allow_role_elevation', 'ALLOW_ROLE_ELEVATION'),
    readTenantValue(tenantId, 'allowed_role_targets', 'ALLOWED_ROLE_TARGETS'),
    readTenantValue(tenantId, 'subject_claim_path', 'SUBJECT_CLAIM_PATH'),
    readTenantValue(tenantId, 'email_claim_path', 'EMAIL_CLAIM_PATH'),
    readTenantValue(
      tenantId,
      'email_verified_claim_path',
      'EMAIL_VERIFIED_CLAIM_PATH'
    ),
    readTenantValue(
      tenantId,
      'display_name_claim_path',
      'DISPLAY_NAME_CLAIM_PATH'
    ),
    readTenantValue(tenantId, 'role_claim_path', 'ROLE_CLAIM_PATH'),
    readTenantValue(tenantId, 'groups_claim_path', 'GROUPS_CLAIM_PATH'),
    readTenantValue(tenantId, 'role_map_json', 'ROLE_MAP_JSON'),
    readTenantValue(tenantId, 'group_map_json', 'GROUP_MAP_JSON'),
    readTenantValue(tenantId, 'oidc.enabled', 'OIDC_ENABLED'),
    readTenantValue(tenantId, 'oidc.client_id', 'OIDC_CLIENT_ID'),
    readTenantValue(tenantId, 'oidc.client_secret', 'OIDC_CLIENT_SECRET'),
    readTenantValue(tenantId, 'oidc.authorize_url', 'OIDC_AUTHORIZE_URL'),
    readTenantValue(tenantId, 'oidc.token_url', 'OIDC_TOKEN_URL'),
    readTenantValue(tenantId, 'oidc.user_info_url', 'OIDC_USER_INFO_URL'),
    readTenantValue(tenantId, 'oidc.issuer', 'OIDC_ISSUER'),
    readTenantValue(tenantId, 'oidc.jwks_url', 'OIDC_JWKS_URL'),
    readTenantValue(tenantId, 'oidc.scopes', 'OIDC_SCOPES'),
    readTenantValue(tenantId, 'oidc.use_pkce', 'OIDC_USE_PKCE'),
    readTenantValue(tenantId, 'oidc.verify_id_token', 'OIDC_VERIFY_ID_TOKEN'),
    readTenantValue(tenantId, 'oidc.state_ttl_seconds', 'OIDC_STATE_TTL_SECONDS'),
    readTenantValue(tenantId, 'oidc.callback_base_url', 'OIDC_CALLBACK_BASE_URL'),
    readTenantValue(tenantId, 'saml.enabled', 'SAML_ENABLED'),
    readTenantValue(tenantId, 'saml.entity_id', 'SAML_ENTITY_ID'),
    readTenantValue(tenantId, 'saml.idp_entity_id', 'SAML_IDP_ENTITY_ID'),
    readTenantValue(tenantId, 'saml.sso_url', 'SAML_SSO_URL'),
    readTenantValue(tenantId, 'saml.x509_cert', 'SAML_X509_CERT'),
    readTenantValue(tenantId, 'saml.expected_audience', 'SAML_EXPECTED_AUDIENCE'),
    readTenantValue(tenantId, 'saml.state_ttl_seconds', 'SAML_STATE_TTL_SECONDS'),
    readTenantValue(tenantId, 'saml.clock_skew_seconds', 'SAML_CLOCK_SKEW_SECONDS'),
    readTenantValue(tenantId, 'saml.callback_base_url', 'SAML_CALLBACK_BASE_URL'),
    readTenantValue(tenantId, 'saml.metadata_url', 'SAML_METADATA_URL'),
    readTenantValue(tenantId, 'saml.metadata_xml', 'SAML_METADATA_XML')
  ]);

  const tenantEnabled = parseEnabled(tenantEnabledRaw, true);
  const domains = resolveDomainList(domainsRaw);
  const organizationIds = parseOrganizationIds(organizationIdsRaw);
  const loginAreas = parseLoginAreas(loginAreasRaw);

  const roleMapping: EnterpriseRoleMappingPolicy = {
    allowJitProvisioning: parseEnabled(allowJitRaw, false),
    allowEmailLinking: parseEnabled(allowEmailLinkingRaw, true),
    requireVerifiedEmail: parseEnabled(requireVerifiedEmailRaw, true),
    allowRoleSync: parseEnabled(allowRoleSyncRaw, false),
    allowRoleElevation: parseEnabled(allowRoleElevationRaw, false),
    allowedRoleTargets: parseAllowedRoleTargets(allowedRoleTargetsRaw),
    subjectClaimPath: subjectClaimPathRaw || 'sub',
    emailClaimPath: emailClaimPathRaw || 'email',
    emailVerifiedClaimPath: emailVerifiedClaimPathRaw || 'email_verified',
    displayNameClaimPath: displayNameClaimPathRaw || 'name',
    roleClaimPath: roleClaimPathRaw || 'role',
    groupsClaimPath: groupsClaimPathRaw || 'groups',
    roleMap: parseRoleMap(roleMapRaw),
    groupMap: parseRoleMap(groupMapRaw)
  };

  const oidcScopes = parseCsv(oidcScopesRaw);
  const oidcConfig: EnterpriseOidcProviderConfig = {
    providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
    enabled: parseEnabled(oidcEnabledRaw, false),
    clientId: oidcClientIdRaw || null,
    clientSecret: oidcClientSecretRaw || null,
    authorizeUrl: oidcAuthorizeUrlRaw,
    tokenUrl: oidcTokenUrlRaw,
    userInfoUrl: oidcUserInfoUrlRaw || null,
    issuer: oidcIssuerRaw || null,
    jwksUrl: oidcJwksUrlRaw || null,
    scopes: oidcScopes.length > 0 ? oidcScopes : [...DEFAULT_OIDC_SCOPES],
    usePkce: parseEnabled(oidcUsePkceRaw, true),
    verifyIdToken: parseEnabled(oidcVerifyIdTokenRaw, true),
    stateTtlSeconds: parsePositiveInt(
      oidcStateTtlRaw,
      runtimeStateTtlSeconds,
      60
    ),
    callbackBaseUrl:
      oidcCallbackBaseUrlRaw ||
      runtimeCallbackBaseUrl ||
      toTrimmedString(process.env.BASE_URL) ||
      null
  };

  let metadataXml = samlMetadataXmlRaw;
  const samlMetadataUrl = samlMetadataUrlRaw || null;
  if (!metadataXml && samlMetadataUrl) {
    metadataXml = (await readMetadataFromUrl(samlMetadataUrl)) ?? '';
  }
  const metadata = parseSamlMetadata(metadataXml);

  const samlEntityId = samlEntityIdRaw || null;
  const samlIdpEntityId = samlIdpEntityIdRaw || metadata.idpEntityId;
  const samlSsoUrl = samlSsoUrlRaw || metadata.ssoUrl;
  const samlX509Cert = normalizeCertificateValue(
    samlX509CertRaw || metadata.x509Cert
  );

  const samlConfig: EnterpriseSamlProviderConfig = {
    providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
    enabled: parseEnabled(samlEnabledRaw, false),
    entityId: samlEntityId,
    idpEntityId: samlIdpEntityId,
    ssoUrl: samlSsoUrl,
    x509Cert: samlX509Cert,
    expectedAudience: samlExpectedAudienceRaw || samlEntityId || null,
    stateTtlSeconds: parsePositiveInt(
      samlStateTtlRaw,
      runtimeStateTtlSeconds,
      60
    ),
    callbackBaseUrl:
      samlCallbackBaseUrlRaw ||
      runtimeCallbackBaseUrl ||
      toTrimmedString(process.env.BASE_URL) ||
      null,
    clockSkewSeconds: parsePositiveInt(
      samlClockSkewRaw,
      DEFAULT_SAML_CLOCK_SKEW_SECONDS,
      0
    ),
    metadataUrl: samlMetadataUrl,
    metadataLoaded: Boolean(metadataXml)
  };

  return {
    tenantId,
    enabled: tenantEnabled,
    domains,
    organizationIds,
    loginAreas,
    roleMapping,
    oidc: oidcConfig,
    saml: samlConfig
  };
}

export async function getEnterpriseRuntimeConfig(): Promise<EnterpriseRuntimeConfig> {
  const [enabledRaw, tenantsRaw, defaultTenantRaw, stateTtlRaw, callbackBaseUrlRaw] =
    await Promise.all([
      readValueWithEnvFallback({
        configKey: 'enabled',
        envKey: 'AUTH_ENTERPRISE_SSO_ENABLED'
      }),
      readValueWithEnvFallback({
        configKey: 'tenants',
        envKey: 'AUTH_ENTERPRISE_SSO_TENANTS'
      }),
      readValueWithEnvFallback({
        configKey: 'default_tenant',
        envKey: 'AUTH_ENTERPRISE_SSO_DEFAULT_TENANT'
      }),
      readValueWithEnvFallback({
        configKey: 'state_ttl_seconds',
        envKey: 'AUTH_ENTERPRISE_SSO_STATE_TTL_SECONDS'
      }),
      readValueWithEnvFallback({
        configKey: 'callback_base_url',
        envKey: 'AUTH_ENTERPRISE_SSO_CALLBACK_BASE_URL'
      })
    ]);

  const defaultTenant = normalizeTenantId(defaultTenantRaw) || null;
  const tenantIdsFromCsv = parseCsv(tenantsRaw)
    .map((entry) => normalizeTenantId(entry))
    .filter((entry) => entry.length > 0);
  if (defaultTenant) {
    tenantIdsFromCsv.push(defaultTenant);
  }

  const tenantSet = new Set<string>();
  for (const tenantId of tenantIdsFromCsv) {
    tenantSet.add(tenantId);
  }

  const tenantIds = Array.from(tenantSet.values()).sort();
  const callbackBaseUrl =
    callbackBaseUrlRaw || toTrimmedString(process.env.BASE_URL) || null;
  const stateTtlSeconds = parsePositiveInt(
    stateTtlRaw,
    DEFAULT_STATE_TTL_SECONDS,
    60
  );

  const tenants: Record<string, EnterpriseTenantConfig> = {};
  for (const tenantId of tenantIds) {
    tenants[tenantId] = await readTenantConfig({
      tenantId,
      runtimeCallbackBaseUrl: callbackBaseUrl,
      runtimeStateTtlSeconds: stateTtlSeconds
    });
  }

  return {
    enabled: parseEnabled(enabledRaw, false),
    defaultTenant,
    tenantIds,
    callbackBaseUrl,
    stateTtlSeconds,
    tenants
  };
}

export function resolveEnterpriseTenantId({
  runtime,
  tenantHint,
  emailHint
}: {
  runtime: EnterpriseRuntimeConfig;
  tenantHint: string | null;
  emailHint: string | null;
}) {
  const normalizedTenantHint = normalizeTenantId(tenantHint || '');
  if (normalizedTenantHint && runtime.tenants[normalizedTenantHint]) {
    return normalizedTenantHint;
  }

  const normalizedEmail = toLowerString(emailHint || '');
  if (normalizedEmail.includes('@')) {
    const domain = normalizedEmail.split('@')[1] || '';
    if (domain) {
      const tenantByDomain = runtime.tenantIds.find((tenantId) =>
        runtime.tenants[tenantId]?.domains.includes(domain)
      );
      if (tenantByDomain) {
        return tenantByDomain;
      }
    }
  }

  if (runtime.defaultTenant && runtime.tenants[runtime.defaultTenant]) {
    return runtime.defaultTenant;
  }

  if (runtime.tenantIds.length === 1) {
    return runtime.tenantIds[0] ?? null;
  }

  return null;
}

export function resolveTenantProviderConfig({
  runtime,
  tenantId,
  providerId
}: {
  runtime: EnterpriseRuntimeConfig;
  tenantId: string;
  providerId: EnterpriseProviderId;
}) {
  const tenant = runtime.tenants[tenantId];
  if (!tenant) {
    return null;
  }

  return providerId === AUTH_ENTERPRISE_OIDC_PROVIDER_ID
    ? tenant.oidc
    : tenant.saml;
}
