import { RouteApi } from '@skitsaas/sdk';

/**
 * Core host API route metadata.
 *
 * Keep this file edge-safe: route metadata only, no DB access or handler imports.
 * Attach handlers in `core/api-entries.ts` and export them through the
 * matching `app/api/.../route.ts` files.
 */
export const CoreApiRoutes = {
  user: {
    get: RouteApi('/user').GET().auth('user').name('api.user.get'),
  },
  team: {
    get: RouteApi('/team').GET().auth('user').name('api.team.get'),
  },
} as const;
