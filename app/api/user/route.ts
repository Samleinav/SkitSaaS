import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getUser } from '@/lib/db/queries';

export const GET = withApiRouteEntries(
  CoreApiRoutes.user.get.handler(async () => Response.json(await getUser()))
);
