import { getTeamForUser, getUser } from '@/lib/db/queries';
import { CoreApiRoutes } from './api-routes';

/**
 * Core host API entries.
 *
 * These are the Node.js-side handlers attached to the edge-safe metadata in
 * `core/api-routes.ts`.
 */
export const CoreApiEntries = {
  user: {
    get: CoreApiRoutes.user.get.handler(async () => {
      const user = await getUser();
      return Response.json(user);
    }),
  },
  team: {
    get: CoreApiRoutes.team.get.handler(async () => {
      const team = await getTeamForUser();
      return Response.json(team);
    }),
  },
} as const;
