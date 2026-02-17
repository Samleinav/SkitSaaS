import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import {
  AUTH_PASSKEY_ADMIN_ALIAS,
  AUTH_PASSKEY_DASHBOARD_ALIAS,
  AUTH_PASSKEY_MODULE_ID,
  AUTH_PASSKEY_MODULE_VERSION
} from './constants';
import { authPasskeyApiHandler } from './api-handler';
import { renderPasskeyAdminPage, renderPasskeyDashboardPage } from './pages';

export default defineModule({
  moduleId: AUTH_PASSKEY_MODULE_ID,
  version: AUTH_PASSKEY_MODULE_VERSION,
  displayName: 'Auth Passkeys',
  description:
    'Passkey/WebAuthn authentication module with challenge lifecycle, credential storage, and session handoff.',
  adminRouteAliases: [AUTH_PASSKEY_ADMIN_ALIAS],
  dashboardRouteAliases: [AUTH_PASSKEY_DASHBOARD_ALIAS],
  adminNavItems: [
    {
      id: 'mod.auth.passkey.admin.nav',
      href: AUTH_PASSKEY_ADMIN_ALIAS,
      label: 'Auth Passkeys',
      order: 65
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.auth.passkey.dashboard.nav',
      href: AUTH_PASSKEY_DASHBOARD_ALIAS,
      label: 'Passkeys',
      order: 65
    }
  ],
  authProviders: [
    {
      providerId: 'passkey',
      kind: 'passkey',
      displayName: 'Passkey',
      description: 'WebAuthn passkey provider.',
      flow: 'both',
      enabledByDefault: false,
      order: 20,
      routes: {
        startPath: '/authentication/options',
        callbackPath: '/authentication/verify',
        healthPath: '/health'
      },
      capabilities: {
        passwordless: true,
        mfa: true
      }
    }
  ],
  adminPage: renderPasskeyAdminPage,
  dashboardPage: renderPasskeyDashboardPage,
  apiHandler: authPasskeyApiHandler
} satisfies ModuleManifest);
