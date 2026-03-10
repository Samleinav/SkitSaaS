import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { getEnabledAuthProviderRegistry } from '@/lib/modules/runtime';

export const GET = withApiRouteEntries(
  CoreApiRoutes.auth.providers.handler(async () => {
    const registry = await getEnabledAuthProviderRegistry();
    return Response.json({
      ok: true,
      providerCount: registry.providers.length,
      providers: registry.providers,
      issues: registry.issues
    });
  })
);
