import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getUser } from '@/lib/db/queries';

const PRIVATE_AUTH_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie'
} as const;

export const GET = withApiRouteEntries(
  CoreApiRoutes.user.get.handler(async () =>
    Response.json(await getUser(), {
      headers: PRIVATE_AUTH_HEADERS
    })
  )
);
