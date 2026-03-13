import '@/lib/routing/area-setup';
import {
  dispatchApiRoutes,
  type ApiRouteEntry,
  type ApiRouteProxyFn,
} from '@skitsaas/sdk';

type ApiRouteHandler = (
  request: Request,
  context?: unknown
) => Promise<Response>;

type ApiRouteDispatchOptions = {
  /**
   * Optional host-level proxies that must run before the route entry chain.
   * Useful for system guards that should short-circuit before auth.
   */
  preDispatch?: ApiRouteProxyFn[];
  onNotFound?: (request: Request, context?: unknown) => Response | Promise<Response>;
};

/**
 * Wrap one or more typed ApiRoute entries as a Next.js route handler.
 *
 * This lets core `app/api/.../route.ts` files reuse the same RouteApi metadata
 * pattern used by module dispatchers: named routes, auth(), rateLimit(), and
 * route-level extra proxies via dispatchApiRoutes().
 */
export function withApiRouteEntries(
  routes: ApiRouteEntry | ApiRouteEntry[],
  options: ApiRouteDispatchOptions = {}
): ApiRouteHandler {
  const entries = Array.isArray(routes) ? routes : [routes];

  return async (request: Request, context?: unknown) => {
    for (const proxy of options.preDispatch ?? []) {
      const result = await proxy(request);
      if (result !== null) {
        return result;
      }
    }

    const response = await dispatchApiRoutes(entries, request);
    if (response) {
      return response;
    }

    if (options.onNotFound) {
      return options.onNotFound(request, context);
    }

    return Response.json({ error: 'Not Found' }, { status: 404 });
  };
}
