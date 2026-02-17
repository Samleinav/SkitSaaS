import { createModuleApiRouter } from '@skitsaas/sdk/server';
import {
  AUTH_SOCIAL_LOGINS_MODULE_ID,
  AUTH_SOCIAL_SUPPORTED_PROVIDERS,
  type SocialProviderId
} from './constants';
import { getAllSocialProviderSummaries, getSocialProviderSummary } from './data';
import {
  createSocialAuthorizationStart,
  disconnectSocialProviderForUser,
  getSocialConnectionsForUser,
  handleSocialAuthorizationCallback
} from './service';

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store'
    }
  });
}

function normalizeProviderId(value: string | undefined): SocialProviderId | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const match = AUTH_SOCIAL_SUPPORTED_PROVIDERS.find(
    (provider) => provider === normalized
  );

  return match ?? null;
}

export const authSocialLoginsApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      auth: 'public',
      handler: async () => {
        const providers = await getAllSocialProviderSummaries();
        return jsonResponse({
          ok: true,
          moduleId: AUTH_SOCIAL_LOGINS_MODULE_ID,
          providers
        });
      }
    },
    {
      method: 'GET',
      path: '/providers',
      auth: 'public',
      handler: async () => {
        const providers = await getAllSocialProviderSummaries();
        return jsonResponse({
          ok: true,
          providers
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/start/:providerId',
      auth: 'public',
      resolveUser: true,
      handler: async ({ params, request, user }) => {
        const providerId = normalizeProviderId(params.providerId);
        if (!providerId) {
          return jsonResponse(
            {
              ok: false,
              error: 'provider_not_supported'
            },
            404
          );
        }

        return createSocialAuthorizationStart({
          providerId,
          request,
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; role?: unknown; email?: unknown })
              : null
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/callback/:providerId',
      auth: 'public',
      resolveUser: true,
      handler: async ({ params, request, user }) => {
        const providerId = normalizeProviderId(params.providerId);
        if (!providerId) {
          return jsonResponse(
            {
              ok: false,
              error: 'provider_not_supported'
            },
            404
          );
        }

        return handleSocialAuthorizationCallback({
          providerId,
          request,
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; role?: unknown; email?: unknown })
              : null
        });
      }
    },
    {
      method: 'GET',
      path: '/provider/:providerId',
      auth: 'admin',
      handler: async ({ params }) => {
        const providerId = normalizeProviderId(params.providerId);
        if (!providerId) {
          return jsonResponse(
            {
              ok: false,
              error: 'provider_not_supported'
            },
            404
          );
        }

        const provider = await getSocialProviderSummary(providerId);
        return jsonResponse({
          ok: true,
          provider
        });
      }
    },
    {
      method: 'GET',
      path: '/connections',
      auth: 'user',
      handler: async ({ user }) => {
        return getSocialConnectionsForUser({
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; role?: unknown; email?: unknown })
              : null
        });
      }
    },
    {
      method: 'POST',
      path: '/disconnect/:providerId',
      auth: 'user',
      handler: async ({ params, user }) => {
        const providerId = normalizeProviderId(params.providerId);
        if (!providerId) {
          return jsonResponse(
            {
              ok: false,
              error: 'provider_not_supported'
            },
            404
          );
        }

        return disconnectSocialProviderForUser({
          providerId,
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; role?: unknown; email?: unknown })
              : null
        });
      }
    }
  ]
});
