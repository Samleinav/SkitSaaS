/**
 * API route builder — typed HTTP method routes with inline auth, rate-limiting, and proxy chains.
 *
 * Two-phase design keeps routes.ts edge-safe (no handlers) and manifest.ts Node.js-only (handlers):
 *
 * routes.ts — metadata only, edge-safe:
 *
 *   import { RouteApi } from '@skitsaas/sdk'
 *   // paths are relative to the API base (default '/api') — omit the base prefix
 *   export const ApiRoutes = {
 *     users: {
 *       list:   RouteApi('/modules/mod.x/users').GET().auth('user').name('mod.x.api.users.list'),
 *       create: RouteApi('/modules/mod.x/users').POST().auth('admin')
 *                 .rateLimit({ limit: 10, windowSeconds: 60 }).name('mod.x.api.users.create'),
 *       update: RouteApi('/modules/mod.x/users/{id}').PUT().auth('admin').name('mod.x.api.users.update'),
 *       delete: RouteApi('/modules/mod.x/users/{id}').DELETE().auth('admin').name('mod.x.api.users.delete'),
 *     }
 *   }
 *
 * manifest.ts — attach handlers (Node.js only):
 *
 *   import { ApiRoutes } from './routes'
 *   import { listUsers, createUser, updateUser, deleteUser } from './handlers/users'
 *
 *   defineModule({
 *     moduleId: 'mod.x',
 *     apiRoutes: [
 *       ApiRoutes.users.list.handler(listUsers),
 *       ApiRoutes.users.create.handler(createUser),
 *       ApiRoutes.users.update.handler(updateUser),
 *       ApiRoutes.users.delete.handler(deleteUser),
 *     ]
 *   })
 *
 * Proxy execution order per route: rateLimit → auth → extras → handler
 */
import type { RateLimitConfig } from './rate-limit.js';
import { RouteBuilder } from './builder.js';
import type { RouteProxyFn, RouteParamMap } from './types.js';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiAuthLevel = 'none' | 'user' | 'admin';
/**
 * A proxy function for API routes.
 * Returns null to continue to the next proxy, or a Response to short-circuit.
 * Uses standard Request (not NextRequest) so it works in module code too.
 */
export type ApiRouteProxyFn = (request: Request) => Promise<Response | null>;
/**
 * Handler function for an API route entry.
 * Receives the matched request and path params extracted from the URL pattern.
 *
 * @example
 * // Route: /api/modules/mod.x/users/{id}
 * // Request: GET /api/modules/mod.x/users/123
 * // params: { id: '123' }
 */
export type ApiHandlerFn = (request: Request, params: Record<string, string>) => Response | Promise<Response>;
/**
 * A fully resolved API route entry — ready for dispatch.
 * Created by calling ApiMethodRouteBuilder.handler(fn) in manifest.ts.
 */
export type ApiRouteEntry = {
    path: string;
    method: HttpMethod;
    authLevel: ApiAuthLevel;
    rateLimitConfig?: RateLimitConfig;
    extraProxies: ApiRouteProxyFn[];
    handler: ApiHandlerFn;
};
type ApiAuthConfig = {
    user: ApiRouteProxyFn | null;
    admin: ApiRouteProxyFn | null;
};
/**
 * Inject auth proxy functions for API route dispatch.
 * Call this in the host project alongside configureAreaDefaults (e.g. lib/routing/area-setup.ts).
 *
 * @example
 * // lib/routing/area-setup.ts
 * import { configureApiAuthProxies } from '@skitsaas/sdk'
 * import { proxyApiAuth, proxyApiAdmin } from './proxies'
 *
 * configureApiAuthProxies({
 *   user:  (req) => proxyApiAuth(req as NextRequest),
 *   admin: (req) => proxyApiAdmin(req as NextRequest),
 * })
 */
export declare function configureApiAuthProxies(config: Partial<ApiAuthConfig>): void;
export declare function getApiAuthConfig(): Readonly<ApiAuthConfig>;
type ApiCorsConfig = {
    /** Origins allowed to call the API cross-origin. Use ['*'] for fully public APIs. */
    allowedOrigins: string[];
    /** Request headers allowed. Default covers the common set. */
    allowedHeaders: string[];
    /** Preflight cache duration in seconds. Default: 86400 (24 h). */
    maxAge: number;
};
/**
 * Configure CORS for API route dispatch.
 * Call in lib/routing/area-setup.ts when deploying the API on a separate origin.
 *
 * @example
 * // lib/routing/area-setup.ts
 * configureApiCors({
 *   allowedOrigins: ['https://app.myapp.com', 'https://admin.myapp.com'],
 * })
 *
 * @example Wildcard (fully public API)
 * configureApiCors({ allowedOrigins: ['*'] })
 */
export declare function configureApiCors(config: Partial<ApiCorsConfig>): void;
export declare function getApiCorsConfig(): Readonly<ApiCorsConfig>;
/**
 * Match a route path pattern against a request pathname.
 * Supports {param} placeholders (consistent with RouteBuilder.with()).
 *
 * Returns extracted params if match, null if no match.
 *
 * @example
 * matchApiPath('/api/modules/mod.x/users/{id}', '/api/modules/mod.x/users/123') // { id: '123' }
 * matchApiPath('/api/modules/mod.x/users', '/api/modules/mod.x/users')          // {}
 * matchApiPath('/api/modules/mod.x/users/{id}', '/api/modules/mod.x/posts/5')   // null
 */
export declare function matchApiPath(pattern: string, pathname: string): Record<string, string> | null;
/**
 * Match and dispatch an API request against a list of ApiRouteEntry objects.
 *
 * Execution order per matched route:
 *   1. Rate limit proxy (cheapest — no DB needed)
 *   2. Auth proxy (session/JWT check, injected via configureApiAuthProxies)
 *   3. Extra proxies (feature flags, custom guards, etc.)
 *   4. Handler
 *
 * Returns null if no route matches (caller should return 404).
 */
export declare function dispatchApiRoutes(routes: ApiRouteEntry[], request: Request): Promise<Response | null>;
/**
 * API route builder. Returned by RouteApi('/path').
 * Extends RouteBuilder with HTTP method factories (.GET(), .POST(), etc.).
 *
 * RouteBuilder's proxy chain is for proxy.ts page routing.
 * For API-specific auth/rate-limit/proxy, use the method factories instead:
 *   RouteApi('/path').GET().auth('user').rateLimit({...}).proxy([...])
 */
export declare class ApiRouteBuilder extends RouteBuilder {
    /**
     * Override proxy() to preserve ApiRouteBuilder type,
     * so chains like RouteApi('/path').proxy([...]).GET() work.
     */
    proxy(fns: RouteProxyFn[]): ApiRouteBuilder;
    /** Create a GET route entry for this path. */
    GET(): ApiMethodRouteBuilder;
    /** Create a POST route entry for this path. */
    POST(): ApiMethodRouteBuilder;
    /** Create a PUT route entry for this path. */
    PUT(): ApiMethodRouteBuilder;
    /** Create a PATCH route entry for this path. */
    PATCH(): ApiMethodRouteBuilder;
    /** Create a DELETE route entry for this path. */
    DELETE(): ApiMethodRouteBuilder;
}
/**
 * Builder for an API route with a specific HTTP method.
 * Returned by RouteApi('/path').GET() / .POST() / etc.
 *
 * Edge-safe: holds only serializable metadata (path, method, auth level, rate-limit config).
 * Attach a handler in manifest.ts via .handler(fn) — that call is Node.js only.
 *
 * Immutable: .auth(), .rateLimit(), .proxy() all return new instances.
 */
export declare class ApiMethodRouteBuilder {
    readonly path: string;
    readonly method: HttpMethod;
    private readonly _authLevel;
    private readonly _rateLimitConfig?;
    private readonly _extraProxies;
    constructor(path: string, method: HttpMethod, authLevel?: ApiAuthLevel, rateLimitConfig?: RateLimitConfig, extraProxies?: ApiRouteProxyFn[]);
    /**
     * Set the authentication requirement for this route.
     *
     * - 'none'  — public (default)
     * - 'user'  — requires active session; uses proxy injected via configureApiAuthProxies
     * - 'admin' — requires admin/owner session; uses proxy injected via configureApiAuthProxies
     */
    auth(level: ApiAuthLevel): ApiMethodRouteBuilder;
    /**
     * Add rate limiting to this route.
     * Rate limit runs first in the proxy chain (before auth — cheapest check first).
     *
     * @example
     * RouteApi('/api/modules/mod.x/export').POST().auth('user').rateLimit({
     *   limit: 10, windowSeconds: 60
     * })
     *
     * @example Per-plan rate limiting
     * .rateLimit({
     *   key: (ctx) => `${ctx.userId ?? ctx.ip}:export`,
     *   limit: (ctx) => ({ pro: 100, free: 5 }[ctx.plan ?? 'free'] ?? 5),
     *   windowSeconds: 3600,
     *   resolveContext: async (req) => {
     *     const user = await getUser()
     *     return { plan: await getUserPlan(user?.id) }
     *   }
     * })
     */
    rateLimit(config: RateLimitConfig): ApiMethodRouteBuilder;
    /**
     * Add extra proxy functions (feature flags, custom guards, quota checks, etc.).
     * These run after rate-limit and auth in the proxy chain.
     *
     * @example
     * .proxy([proxyFeatureFlag('premium'), proxyQuota('exports')])
     */
    proxy(fns: ApiRouteProxyFn[]): ApiMethodRouteBuilder;
    /**
     * Register this route in the named route registry for URL construction.
     * Returns `this` for chaining.
     *
     * @example
     * RouteApi('/api/modules/mod.x/users').GET().auth('user').name('mod.x.api.users.list')
     * route('mod.x.api.users.list') // '/api/modules/mod.x/users'
     */
    name(routeName: string): this;
    /**
     * Interpolate {param} placeholders in the path.
     *
     * @example
     * ApiRoutes.users.update.with({ id: 5 }) // '/api/modules/mod.x/users/5'
     */
    with(params: RouteParamMap): string;
    /**
     * Attach a handler function. Returns an ApiRouteEntry ready for defineModule's apiRoutes array.
     *
     * Call this in manifest.ts (Node.js only — this is where handler imports live).
     *
     * @example
     * // manifest.ts
     * apiRoutes: [
     *   ApiRoutes.users.list.handler(listUsers),
     *   ApiRoutes.users.create.handler(createUser),
     * ]
     */
    handler(fn: ApiHandlerFn): ApiRouteEntry;
    toString(): string;
    valueOf(): string;
    [Symbol.toPrimitive](_hint: string): string;
}
export {};
