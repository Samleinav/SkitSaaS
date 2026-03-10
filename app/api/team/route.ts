import { CoreApiEntries } from '@/core/api-entries';
import { proxyApiTeamsEnabled } from '@/lib/routing/proxies';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const GET = withApiRouteEntries(CoreApiEntries.team.get, {
  preDispatch: [proxyApiTeamsEnabled],
});
