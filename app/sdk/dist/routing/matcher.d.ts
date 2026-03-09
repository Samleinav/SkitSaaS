import type { RouteProxyFn } from './types.js';
/**
 * Returns the area-level fallback proxy chain for a pathname,
 * using whatever was configured via configureAreaDefaults().
 *
 * - /admin/* → area admin defaults (e.g. [proxyAdmin])
 * - /dashboard/* → area dashboard defaults (e.g. [proxyAuth])
 * - anything else → frontend defaults (usually [])
 */
export declare function resolveAreaFallbackChain(pathname: string): RouteProxyFn[];
/**
 * Match the incoming pathname against the route registry using longest-prefix
 * matching. Returns the full proxy chain of the matched route.
 *
 * Falls back to resolveAreaFallbackChain if no registered route matches.
 *
 * This ensures that:
 * - Routes with extra proxies (via .proxy([...])) run those proxies.
 * - Unregistered paths in protected areas still get the area-level proxy.
 */
export declare function matchRouteProxyChain(pathname: string): RouteProxyFn[];
