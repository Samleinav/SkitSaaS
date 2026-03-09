import { getAllRegisteredRoutes } from './registry.js';
import { getAreaDefaults } from './area.js';
/**
 * Returns the area-level fallback proxy chain for a pathname,
 * using whatever was configured via configureAreaDefaults().
 *
 * - /admin/* → area admin defaults (e.g. [proxyAdmin])
 * - /dashboard/* → area dashboard defaults (e.g. [proxyAuth])
 * - anything else → frontend defaults (usually [])
 */
export function resolveAreaFallbackChain(pathname) {
    const defaults = getAreaDefaults();
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        return defaults.admin;
    }
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
        return defaults.dashboard;
    }
    return defaults.frontend;
}
function isSegmentPrefix(prefix, pathname) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
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
export function matchRouteProxyChain(pathname) {
    const routes = getAllRegisteredRoutes();
    let bestMatch = null;
    for (const [, entry] of routes) {
        // Strip {param} segments from the registered path for prefix matching.
        // e.g. "/admin/users/{id}" → "/admin/users"
        const staticPrefix = entry.path.replace(/\/\{[^}]+\}.*$/, '');
        if (!isSegmentPrefix(staticPrefix, pathname)) {
            continue;
        }
        // Longest registered path wins (most specific match).
        if (!bestMatch || staticPrefix.length > bestMatch.path.length) {
            bestMatch = { path: staticPrefix, proxies: entry.proxies };
        }
    }
    if (bestMatch) {
        return bestMatch.proxies;
    }
    return resolveAreaFallbackChain(pathname);
}
