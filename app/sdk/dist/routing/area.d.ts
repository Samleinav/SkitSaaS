import { RouteBuilder } from './builder.js';
import { ApiRouteBuilder } from './api-route.js';
import type { RouteProxyFn } from './types.js';
type AreaDefaults = {
    admin: RouteProxyFn[];
    dashboard: RouteProxyFn[];
    frontend: RouteProxyFn[];
    api: RouteProxyFn[];
};
/**
 * Configure the default proxy chains for each route area.
 * Call this in the host project (e.g. lib/routing/setup.ts) with your
 * actual proxy functions (proxyAdmin, proxyAuth) before routes are matched.
 *
 * @example
 * // lib/routing/setup.ts (host project)
 * import { configureAreaDefaults } from '@skitsaas/sdk'
 * import { proxyAdmin, proxyAuth } from './proxies'
 *
 * configureAreaDefaults({ admin: [proxyAdmin], dashboard: [proxyAuth] })
 */
export declare function configureAreaDefaults(config: Partial<AreaDefaults>): void;
export declare function getAreaDefaults(): Readonly<AreaDefaults>;
/**
 * Base URL prefix (or full origin) for each route area.
 *
 * Defaults produce the standard same-host path prefixes.
 * Override via env vars (see NEXT_PUBLIC_ROUTE_BASE_*) to split areas across
 * separate hosts — e.g. API on `https://api.myapp.com`.
 *
 * When a base is a full URL (starts with `http`), the resulting route path
 * is a fully qualified URL:
 *   RouteApi('/modules/mod.x/items')  →  'https://api.myapp.com/modules/mod.x/items'
 *
 * Page routes (admin, dashboard, frontend) with cross-origin base produce a
 * hard navigation to the other host — correct for separate Next.js deployments.
 * API routes with cross-origin base are transparent for fetch().
 */
export type AreaBases = {
    /** Prefix for admin area.     Default: '/admin'     */
    admin: string;
    /** Prefix for dashboard area. Default: '/dashboard' */
    dashboard: string;
    /** Prefix for frontend area.  Default: ''           */
    frontend: string;
    /** Prefix for API routes.     Default: '/api'       */
    api: string;
};
/**
 * Override the base URL prefix for one or more route areas.
 * Call once during app initialisation (e.g. lib/routing/area-setup.ts).
 *
 * @example
 * // lib/routing/area-setup.ts
 * configureAreaBases({
 *   api: process.env.NEXT_PUBLIC_ROUTE_BASE_API ?? '/api',
 * })
 *
 * @example Multi-service split
 * configureAreaBases({
 *   admin:  'https://admin.myapp.com',
 *   api:    'https://api.myapp.com',
 * })
 */
export declare function configureAreaBases(config: Partial<AreaBases>): void;
export declare function getAreaBases(): Readonly<AreaBases>;
/**
 * Creates an area factory: a function that builds RouteBuilder instances
 * with a fixed path prefix and a set of default proxy functions.
 *
 * @example
 * const MyArea = RouteArea('/my-prefix', [myProxy])
 * MyArea('/dashboard')  // RouteBuilder for "/my-prefix/dashboard"
 */
export declare function RouteArea(prefix: string, defaultProxies: RouteProxyFn[]): (path: string) => RouteBuilder;
/**
 * Admin area factory.
 * Default proxies are whatever was registered via configureAreaDefaults().
 * In the host project, that is [proxyAdmin] (session + DB admin role check).
 *
 * Base prefix is configurable via configureAreaBases() or NEXT_PUBLIC_ROUTE_BASE_ADMIN.
 * Default: '/admin'.
 *
 * @example
 * RouteAdmin('/users').name('admin.users')        // "/admin/users"
 * RouteAdmin('/users/{id}').name('admin.user.edit')
 */
export declare const RouteAdmin: (path: string) => RouteBuilder;
/**
 * Dashboard area factory.
 * Default proxies are whatever was registered via configureAreaDefaults().
 * In the host project, that is [proxyAuth] (session + DB active user check).
 *
 * Base prefix is configurable via configureAreaBases() or NEXT_PUBLIC_ROUTE_BASE_DASHBOARD.
 * Default: '/dashboard'.
 *
 * @example
 * RouteDashboard('/general').name('dashboard.general')
 */
export declare const RouteDashboard: (path: string) => RouteBuilder;
/**
 * Frontend area factory. No default proxies.
 * Open to all visitors unless per-route proxies are added.
 *
 * Base prefix is configurable via configureAreaBases() or NEXT_PUBLIC_ROUTE_BASE_FRONTEND.
 * Default: '' (root).
 *
 * @example
 * RouteFrontend('/pricing').name('frontend.pricing')
 */
export declare const RouteFrontend: (path: string) => RouteBuilder;
/**
 * API route factory. Returns an ApiRouteBuilder which extends RouteBuilder
 * with HTTP method factories (.GET(), .POST(), .PUT(), .PATCH(), .DELETE()).
 *
 * Pass the path relative to the API base (omit the base prefix — it is added automatically).
 * Base prefix is configurable via configureAreaBases() or NEXT_PUBLIC_ROUTE_BASE_API.
 * Default: '/api'.
 *
 * Use the method factories to define typed API routes with inline auth,
 * rate-limiting, and proxy chains. Attach handlers in manifest.ts via .handler(fn).
 *
 * @example
 * // routes.ts — metadata only, edge-safe
 * // path is relative to api base — do NOT include the base prefix
 * RouteApi('/modules/mod.x/users').GET().auth('user').name('mod.x.api.users.list')
 * RouteApi('/modules/mod.x/users').POST().auth('admin').rateLimit({ limit: 10, windowSeconds: 60 })
 * RouteApi('/modules/mod.x/users/{id}').PUT().auth('admin')
 *
 * // Still works as a plain URL builder (no method):
 * RouteApi('/modules/mod.x').name('mod.x.api.base')  // '/api/modules/mod.x' (default base)
 */
export declare const RouteApi: (path: string) => ApiRouteBuilder;
export {};
