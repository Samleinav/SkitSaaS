import { CoreApiEntries } from '@/core/api-entries';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';

export const GET = withApiRouteEntries(CoreApiEntries.user.get);
