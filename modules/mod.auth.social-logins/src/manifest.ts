import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import {
  AUTH_SOCIAL_LOGINS_ADMIN_ALIAS,
  AUTH_SOCIAL_LOGINS_DASHBOARD_ALIAS,
  AUTH_SOCIAL_LOGINS_MODULE_ID,
  AUTH_SOCIAL_LOGINS_MODULE_VERSION
} from './constants';
import { authSocialLoginsApiHandler } from './api-handler';
import {
  renderSocialLoginsAdminPage,
  renderSocialLoginsDashboardPage
} from './pages';

export default defineModule({
  moduleId: AUTH_SOCIAL_LOGINS_MODULE_ID,
  version: AUTH_SOCIAL_LOGINS_MODULE_VERSION,
  displayName: 'Auth Social Logins',
  description:
    'OAuth social authentication module for Google, GitHub, X, with state/PKCE protection and secure identity linking.',
  adminRouteAliases: [AUTH_SOCIAL_LOGINS_ADMIN_ALIAS],
  dashboardRouteAliases: [AUTH_SOCIAL_LOGINS_DASHBOARD_ALIAS],
  adminNavItems: [
    {
      id: 'mod.auth.social-logins.admin.nav',
      href: AUTH_SOCIAL_LOGINS_ADMIN_ALIAS,
      label: 'Social Logins',
      order: 66
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.auth.social-logins.dashboard.nav',
      href: AUTH_SOCIAL_LOGINS_DASHBOARD_ALIAS,
      label: 'Linked Accounts',
      order: 66
    }
  ],
  authProviders: [
    {
      providerId: 'google',
      kind: 'oauth2',
      displayName: 'Google',
      description: 'Google OAuth social provider.',
      flow: 'both',
      enabledByDefault: false,
      order: 30,
      routes: {
        startPath: '/start/google',
        callbackPath: '/callback/google',
        healthPath: '/health'
      },
      capabilities: {
        justInTimeProvisioning: true
      }
    },
    {
      providerId: 'github',
      kind: 'oauth2',
      displayName: 'GitHub',
      description: 'GitHub OAuth social provider.',
      flow: 'both',
      enabledByDefault: false,
      order: 31,
      routes: {
        startPath: '/start/github',
        callbackPath: '/callback/github',
        healthPath: '/health'
      },
      capabilities: {
        justInTimeProvisioning: true
      }
    },
    {
      providerId: 'x',
      kind: 'oauth2',
      displayName: 'X',
      description: 'X OAuth social provider.',
      flow: 'both',
      enabledByDefault: false,
      order: 32,
      routes: {
        startPath: '/start/x',
        callbackPath: '/callback/x',
        healthPath: '/health'
      },
      capabilities: {
        justInTimeProvisioning: true
      }
    }
  ],
  adminPage: renderSocialLoginsAdminPage,
  dashboardPage: renderSocialLoginsDashboardPage,
  apiHandler: authSocialLoginsApiHandler
} satisfies ModuleManifest);
