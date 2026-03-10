import { CoreApiRoutes } from '@/core/api-routes';
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { proxyBuildFormValidateAccess } from '@/lib/routing/proxies';
import { handleBuildFormPreflightRequest } from '@/lib/forms/preflight';

export const POST = withApiRouteEntries(
  CoreApiRoutes.forms.validate.handler(handleBuildFormPreflightRequest),
  { preDispatch: [proxyBuildFormValidateAccess] }
);
