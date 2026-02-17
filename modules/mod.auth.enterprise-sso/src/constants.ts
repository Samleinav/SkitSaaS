export const AUTH_ENTERPRISE_SSO_MODULE_ID = 'mod.auth.enterprise-sso';
export const AUTH_ENTERPRISE_SSO_MODULE_VERSION = '0.1.0';

export const AUTH_ENTERPRISE_SSO_ADMIN_ALIAS =
  '/admin/custom/auth-enterprise-sso';
export const AUTH_ENTERPRISE_SSO_DASHBOARD_ALIAS =
  '/dashboard/custom/enterprise-sso';

export const AUTH_ENTERPRISE_OIDC_PROVIDER_ID = 'enterprise-oidc';
export const AUTH_ENTERPRISE_SAML_PROVIDER_ID = 'enterprise-saml';

export const AUTH_ENTERPRISE_SUPPORTED_PROVIDERS = [
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID
] as const;

export type EnterpriseProviderId =
  (typeof AUTH_ENTERPRISE_SUPPORTED_PROVIDERS)[number];

export const ENTERPRISE_AUTH_FLOW_VALUES = ['login', 'link'] as const;
export type EnterpriseAuthFlow = (typeof ENTERPRISE_AUTH_FLOW_VALUES)[number];

export const ENTERPRISE_AUTH_AREAS = ['admin', 'dashboard'] as const;
export type EnterpriseAuthArea = (typeof ENTERPRISE_AUTH_AREAS)[number];

export const ENTERPRISE_USER_ROLES = ['member', 'admin', 'owner'] as const;
export type EnterpriseUserRole = (typeof ENTERPRISE_USER_ROLES)[number];
