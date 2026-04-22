import '@/lib/routing/area-setup';
import {
  dispatchApiRoutes,
  getApiCorsConfig,
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

function buildCorsHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get('Origin');
  const corsConfig = getApiCorsConfig();
  if (!corsConfig.allowedOrigins.length) {
    return {};
  }

  const isWildcard = corsConfig.allowedOrigins.includes('*');
  const originAllowed =
    isWildcard ||
    (requestOrigin !== null && corsConfig.allowedOrigins.includes(requestOrigin));

  if (!originAllowed) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': isWildcard ? '*' : (requestOrigin as string),
    'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...(isWildcard ? {} : { Vary: 'Origin' })
  };
}

function withCorsHeaders(
  response: Response,
  corsHeaders: Record<string, string>
): Response {
  if (Object.keys(corsHeaders).length === 0) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

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
    const corsHeaders = buildCorsHeaders(request);
    const corsConfig = getApiCorsConfig();

    if (request.method.toUpperCase() === 'OPTIONS' && Object.keys(corsHeaders).length > 0) {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          'Access-Control-Max-Age': String(corsConfig.maxAge)
        }
      });
    }

    for (const proxy of options.preDispatch ?? []) {
      const result = await proxy(request);
      if (result !== null) {
        return withCorsHeaders(result, corsHeaders);
      }
    }

    const response = await dispatchApiRoutes(entries, request);
    if (response) {
      return response;
    }

    if (options.onNotFound) {
      return withCorsHeaders(await options.onNotFound(request, context), corsHeaders);
    }

    return withCorsHeaders(
      Response.json({ error: 'Not Found' }, { status: 404 }),
      corsHeaders
    );
  };
}
