import { createModuleApiRouter } from '@skitsaas/sdk/server';
import {
  AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
  AUTH_ENTERPRISE_SAML_PROVIDER_ID,
  AUTH_ENTERPRISE_SSO_MODULE_ID
} from './constants';
import {
  createEnterpriseOidcAuthorizationStart,
  createEnterpriseSamlStart,
  getEnterpriseConnectionsForUser,
  handleEnterpriseOidcAuthorizationCallback,
  handleEnterpriseSamlAcsCallback
} from './service';
import { getEnterpriseProviderSummaries } from './data';

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });
}

export const authEnterpriseSsoApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      auth: 'public',
      handler: async () => {
        const providers = await getEnterpriseProviderSummaries();
        return jsonResponse({
          ok: true,
          moduleId: AUTH_ENTERPRISE_SSO_MODULE_ID,
          providers
        });
      }
    },
    {
      method: 'GET',
      path: '/providers',
      auth: 'public',
      handler: async () => {
        const providers = await getEnterpriseProviderSummaries();
        return jsonResponse({
          ok: true,
          providers
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/start/oidc',
      auth: 'public',
      handler: async ({ request }) => {
        return createEnterpriseOidcAuthorizationStart({
          request
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/callback/oidc',
      auth: 'public',
      handler: async ({ request }) => {
        return handleEnterpriseOidcAuthorizationCallback({
          request
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/start/saml',
      auth: 'public',
      handler: async ({ request }) => {
        return createEnterpriseSamlStart({
          request
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/acs/saml',
      auth: 'public',
      handler: async ({ request }) => {
        return handleEnterpriseSamlAcsCallback({
          request
        });
      }
    },
    {
      method: 'GET',
      path: '/connections',
      auth: 'user',
      handler: async ({ user }) => {
        return getEnterpriseConnectionsForUser({
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; role?: unknown; email?: unknown })
              : null
        });
      }
    },
    {
      method: 'GET',
      path: '/provider/oidc',
      auth: 'public',
      handler: async () => {
        const providers = await getEnterpriseProviderSummaries();
        return jsonResponse({
          ok: true,
          providerId: AUTH_ENTERPRISE_OIDC_PROVIDER_ID,
          providers: providers.filter(
            (provider) => provider.providerId === AUTH_ENTERPRISE_OIDC_PROVIDER_ID
          )
        });
      }
    },
    {
      method: 'GET',
      path: '/provider/saml',
      auth: 'public',
      handler: async () => {
        const providers = await getEnterpriseProviderSummaries();
        return jsonResponse({
          ok: true,
          providerId: AUTH_ENTERPRISE_SAML_PROVIDER_ID,
          providers: providers.filter(
            (provider) => provider.providerId === AUTH_ENTERPRISE_SAML_PROVIDER_ID
          )
        });
      }
    }
  ]
});
