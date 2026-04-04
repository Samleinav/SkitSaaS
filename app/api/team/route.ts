import { CoreApiRoutes } from '@/core/api-routes';
import { proxyApiTeamsEnabled } from '@/lib/routing/proxies';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getTeamForUser } from '@/lib/db/queries';

const PRIVATE_AUTH_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie'
} as const;

export const GET = withApiRouteEntries(
  CoreApiRoutes.team.get.handler(async () =>
    Response.json(await getTeamForUser(), {
      headers: PRIVATE_AUTH_HEADERS
    })
  ),
  { preDispatch: [proxyApiTeamsEnabled] }
);
