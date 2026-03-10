import { CoreApiRoutes } from '@/core/api-routes';
import { proxyApiTeamsEnabled } from '@/lib/routing/proxies';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getTeamForUser } from '@/lib/db/queries';

export const GET = withApiRouteEntries(
  CoreApiRoutes.team.get.handler(async () => Response.json(await getTeamForUser())),
  { preDispatch: [proxyApiTeamsEnabled] }
);
