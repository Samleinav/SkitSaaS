import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import {
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID,
  AUTH_ENTERPRISE_SSO_ADMIN_ALIAS,
  AUTH_ENTERPRISE_SSO_DASHBOARD_ALIAS,
  AUTH_ENTERPRISE_SSO_MODULE_ID,
  AUTH_ENTERPRISE_SSO_MODULE_VERSION
} from './constants';
import { authEnterpriseSsoApiHandler } from './api-handler';
import {
  renderEnterpriseSsoAdminPage,
  renderEnterpriseSsoDashboardPage
} from './pages';

export default defineModule({
  moduleId: AUTH_ENTERPRISE_SSO_MODULE_ID,
  version: AUTH_ENTERPRISE_SSO_MODULE_VERSION,
  displayName: 'Auth Enterprise SSO',
  description:
    'Enterprise SSO module for tenant-scoped OIDC and SAML providers with claim mapping and fail-closed callbacks.',
  adminRouteAliases: [AUTH_ENTERPRISE_SSO_ADMIN_ALIAS],
  dashboardRouteAliases: [AUTH_ENTERPRISE_SSO_DASHBOARD_ALIAS],
  adminNavItems: [
    {
      id: 'mod.auth.enterprise-sso.admin.nav',
      href: AUTH_ENTERPRISE_SSO_ADMIN_ALIAS,
      label: 'Enterprise SSO',
      order: 67
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.auth.enterprise-sso.dashboard.nav',
      href: AUTH_ENTERPRISE_SSO_DASHBOARD_ALIAS,
      label: 'Enterprise SSO',
      order: 67
    }
  ],
  authProviders: [
    {
      providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
      kind: 'oidc',
      displayName: 'Enterprise OIDC',
      description: 'Tenant-scoped OIDC provider for enterprise SSO.',
      flow: 'login',
      enabledByDefault: false,
      order: 40,
      routes: {
        startPath: '/start/oidc',
        callbackPath: '/callback/oidc',
        healthPath: '/health'
      },
      capabilities: {
        enterprise: true,
        groupsSync: true,
        justInTimeProvisioning: true
      }
    },
    {
      providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
      kind: 'saml',
      displayName: 'Enterprise SAML',
      description: 'Tenant-scoped SAML provider for enterprise SSO.',
      flow: 'login',
      enabledByDefault: false,
      order: 41,
      routes: {
        startPath: '/start/saml',
        callbackPath: '/acs/saml',
        healthPath: '/health'
      },
      capabilities: {
        enterprise: true,
        groupsSync: true,
        justInTimeProvisioning: true
      }
    }
  ],
  adminPage: renderEnterpriseSsoAdminPage,
  dashboardPage: renderEnterpriseSsoDashboardPage,
  apiHandler: authEnterpriseSsoApiHandler
} satisfies ModuleManifest);
