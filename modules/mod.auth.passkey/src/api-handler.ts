import { createModuleApiRouter } from '@skitsaas/sdk/server';
import { AUTH_PASSKEY_MODULE_ID, AUTH_PASSKEY_PROVIDER_ID } from './constants';
import { getPasskeyCapabilitySummary } from './data';
import {
  createAuthenticationOptions,
  createAuthenticationStartResponse,
  createRegistrationOptions,
  verifyAuthentication,
  verifyRegistration
} from './service';

function jsonResponse(body: Record<string, unknown>, status: number = 200) {
  return Response.json(body, { status });
}

export const authPasskeyApiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      auth: 'public',
      handler: async () => {
        const summary = await getPasskeyCapabilitySummary();
        return jsonResponse({
          ok: true,
          moduleId: AUTH_PASSKEY_MODULE_ID,
          providerId: AUTH_PASSKEY_PROVIDER_ID,
          status: summary.status,
          message: summary.message
        });
      }
    },
    {
      method: 'GET',
      path: '/config',
      auth: 'admin',
      handler: async () => {
        const summary = await getPasskeyCapabilitySummary();
        return jsonResponse({
          ok: true,
          providerId: AUTH_PASSKEY_PROVIDER_ID,
          config: summary
        });
      }
    },
    {
      method: 'POST',
      path: '/registration/options',
      auth: 'user',
      handler: async ({ user }) => {
        const summary = await getPasskeyCapabilitySummary();
        if (summary.status !== 'ready') {
          return jsonResponse(
            {
              ok: false,
              error: 'passkey_provider_not_ready',
              status: summary.status,
              message: summary.message
            },
            503
          );
        }

        return createRegistrationOptions({
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; email?: unknown; role?: unknown; name?: unknown })
              : null
        });
      }
    },
    {
      method: 'POST',
      path: '/registration/verify',
      auth: 'user',
      handler: async ({ user, request }) => {
        const summary = await getPasskeyCapabilitySummary();
        if (summary.status !== 'ready') {
          return jsonResponse(
            {
              ok: false,
              error: 'passkey_provider_not_ready',
              status: summary.status,
              message: summary.message
            },
            503
          );
        }

        return verifyRegistration({
          user:
            user && typeof user === 'object'
              ? (user as { id?: unknown; email?: unknown; role?: unknown; name?: unknown })
              : null,
          request
        });
      }
    },
    {
      method: ['GET', 'POST'],
      path: '/authentication/options',
      auth: 'public',
      handler: async ({ request }) => {
        const summary = await getPasskeyCapabilitySummary();
        if (summary.status !== 'ready') {
          return jsonResponse(
            {
              ok: false,
              error: 'passkey_provider_not_ready',
              status: summary.status,
              message: summary.message
            },
            503
          );
        }

        if (request.method === 'GET') {
          return createAuthenticationStartResponse({ request });
        }

        return createAuthenticationOptions({ request });
      }
    },
    {
      method: 'POST',
      path: '/authentication/verify',
      auth: 'public',
      handler: async ({ request }) => {
        const summary = await getPasskeyCapabilitySummary();
        if (summary.status !== 'ready') {
          return jsonResponse(
            {
              ok: false,
              error: 'passkey_provider_not_ready',
              status: summary.status,
              message: summary.message
            },
            503
          );
        }

        return verifyAuthentication({
          request
        });
      }
    }
  ]
});
