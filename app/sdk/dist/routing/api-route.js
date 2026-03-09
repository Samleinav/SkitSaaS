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
import { checkRateLimit } from './rate-limit.js';
import { registerRoute } from './registry.js';
import { RouteBuilder } from './builder.js';
const apiAuthConfig = {
    user: null,
    admin: null,
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
export function configureApiAuthProxies(config) {
    if (config.user !== undefined)
        apiAuthConfig.user = config.user;
    if (config.admin !== undefined)
        apiAuthConfig.admin = config.admin;
}
export function getApiAuthConfig() {
    return apiAuthConfig;
}
const apiCorsConfig = {
    allowedOrigins: [],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
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
export function configureApiCors(config) {
    if (config.allowedOrigins !== undefined)
        apiCorsConfig.allowedOrigins = config.allowedOrigins;
    if (config.allowedHeaders !== undefined)
        apiCorsConfig.allowedHeaders = config.allowedHeaders;
    if (config.maxAge !== undefined)
        apiCorsConfig.maxAge = config.maxAge;
}
export function getApiCorsConfig() {
    return apiCorsConfig;
}
function buildCorsHeaders(requestOrigin) {
    if (!apiCorsConfig.allowedOrigins.length)
        return {};
    const isWildcard = apiCorsConfig.allowedOrigins.includes('*');
    const originAllowed = isWildcard ||
        (requestOrigin !== null && apiCorsConfig.allowedOrigins.includes(requestOrigin));
    if (!originAllowed)
        return {};
    const allowOrigin = isWildcard ? '*' : requestOrigin;
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': apiCorsConfig.allowedHeaders.join(', '),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        ...(isWildcard ? {} : { Vary: 'Origin' }),
    };
}
// ---------------------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------------------
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
export function matchApiPath(pattern, pathname) {
    const paramNames = [];
    const regexSource = pattern.replace(/\{(\w+)\}/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });
    const regex = new RegExp(`^${regexSource}$`);
    const match = regex.exec(pathname);
    if (!match)
        return null;
    const params = {};
    for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = match[i + 1];
    }
    return params;
}
// ---------------------------------------------------------------------------
// Rate limit → ApiRouteProxyFn adapter
// ---------------------------------------------------------------------------
function makeRateLimitProxy(config) {
    return async (request) => {
        const result = await checkRateLimit(config, request);
        if (!result.limited)
            return null;
        return Response.json({ error: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) }
        });
    };
}
// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
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
export async function dispatchApiRoutes(routes, request) {
    const rawMethod = request.method.toUpperCase();
    const method = rawMethod;
    const pathname = new URL(request.url).pathname;
    const requestOrigin = request.headers.get('Origin');
    const corsHeaders = buildCorsHeaders(requestOrigin);
    const hasCors = Object.keys(corsHeaders).length > 0;
    // Handle CORS preflight (OPTIONS) when CORS is configured.
    // Respond immediately without touching route handlers.
    if (rawMethod === 'OPTIONS' && hasCors) {
        return new Response(null, {
            status: 204,
            headers: {
                ...corsHeaders,
                'Access-Control-Max-Age': String(apiCorsConfig.maxAge),
            },
        });
    }
    for (const entry of routes) {
        if (entry.method !== method)
            continue;
        // entry.path may be a full URL when a cross-origin base is configured.
        // Always compare only the pathname portion.
        const entryPathname = entry.path.startsWith('http')
            ? new URL(entry.path).pathname
            : entry.path;
        const params = matchApiPath(entryPathname, pathname);
        if (params === null)
            continue;
        // Build proxy chain
        const proxies = [];
        // 1. Rate limit first — cheapest, no auth dependency
        if (entry.rateLimitConfig) {
            proxies.push(makeRateLimitProxy(entry.rateLimitConfig));
        }
        // 2. Auth proxy — resolved lazily so import order doesn't matter
        if (entry.authLevel === 'admin' && apiAuthConfig.admin) {
            proxies.push(apiAuthConfig.admin);
        }
        else if (entry.authLevel === 'user' && apiAuthConfig.user) {
            proxies.push(apiAuthConfig.user);
        }
        // 3. Extra proxies (feature flags, custom checks)
        proxies.push(...entry.extraProxies);
        // Execute chain — first non-null response short-circuits
        for (const proxy of proxies) {
            const result = await proxy(request);
            if (result !== null) {
                return hasCors ? addCorsHeaders(result, corsHeaders) : result;
            }
        }
        const response = await entry.handler(request, params);
        return hasCors ? addCorsHeaders(response, corsHeaders) : response;
    }
    return null; // no match → caller returns 404
}
function addCorsHeaders(response, corsHeaders) {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
// ---------------------------------------------------------------------------
// ApiRouteBuilder — extends RouteBuilder, adds HTTP method factories
// ---------------------------------------------------------------------------
/**
 * API route builder. Returned by RouteApi('/path').
 * Extends RouteBuilder with HTTP method factories (.GET(), .POST(), etc.).
 *
 * RouteBuilder's proxy chain is for proxy.ts page routing.
 * For API-specific auth/rate-limit/proxy, use the method factories instead:
 *   RouteApi('/path').GET().auth('user').rateLimit({...}).proxy([...])
 */
export class ApiRouteBuilder extends RouteBuilder {
    /**
     * Override proxy() to preserve ApiRouteBuilder type,
     * so chains like RouteApi('/path').proxy([...]).GET() work.
     */
    proxy(fns) {
        return new ApiRouteBuilder(this.path, this.defaultProxies, [
            ...this.extraProxies,
            ...fns
        ]);
    }
    /** Create a GET route entry for this path. */
    GET() {
        return new ApiMethodRouteBuilder(this.path, 'GET');
    }
    /** Create a POST route entry for this path. */
    POST() {
        return new ApiMethodRouteBuilder(this.path, 'POST');
    }
    /** Create a PUT route entry for this path. */
    PUT() {
        return new ApiMethodRouteBuilder(this.path, 'PUT');
    }
    /** Create a PATCH route entry for this path. */
    PATCH() {
        return new ApiMethodRouteBuilder(this.path, 'PATCH');
    }
    /** Create a DELETE route entry for this path. */
    DELETE() {
        return new ApiMethodRouteBuilder(this.path, 'DELETE');
    }
}
// ---------------------------------------------------------------------------
// ApiMethodRouteBuilder — metadata-only, edge-safe
// ---------------------------------------------------------------------------
/**
 * Builder for an API route with a specific HTTP method.
 * Returned by RouteApi('/path').GET() / .POST() / etc.
 *
 * Edge-safe: holds only serializable metadata (path, method, auth level, rate-limit config).
 * Attach a handler in manifest.ts via .handler(fn) — that call is Node.js only.
 *
 * Immutable: .auth(), .rateLimit(), .proxy() all return new instances.
 */
export class ApiMethodRouteBuilder {
    path;
    method;
    _authLevel;
    _rateLimitConfig;
    _extraProxies;
    constructor(path, method, authLevel = 'none', rateLimitConfig, extraProxies = []) {
        this.path = path;
        this.method = method;
        this._authLevel = authLevel;
        this._rateLimitConfig = rateLimitConfig;
        this._extraProxies = extraProxies;
    }
    /**
     * Set the authentication requirement for this route.
     *
     * - 'none'  — public (default)
     * - 'user'  — requires active session; uses proxy injected via configureApiAuthProxies
     * - 'admin' — requires admin/owner session; uses proxy injected via configureApiAuthProxies
     */
    auth(level) {
        return new ApiMethodRouteBuilder(this.path, this.method, level, this._rateLimitConfig, this._extraProxies);
    }
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
    rateLimit(config) {
        return new ApiMethodRouteBuilder(this.path, this.method, this._authLevel, config, this._extraProxies);
    }
    /**
     * Add extra proxy functions (feature flags, custom guards, quota checks, etc.).
     * These run after rate-limit and auth in the proxy chain.
     *
     * @example
     * .proxy([proxyFeatureFlag('premium'), proxyQuota('exports')])
     */
    proxy(fns) {
        return new ApiMethodRouteBuilder(this.path, this.method, this._authLevel, this._rateLimitConfig, [...this._extraProxies, ...fns]);
    }
    /**
     * Register this route in the named route registry for URL construction.
     * Returns `this` for chaining.
     *
     * @example
     * RouteApi('/api/modules/mod.x/users').GET().auth('user').name('mod.x.api.users.list')
     * route('mod.x.api.users.list') // '/api/modules/mod.x/users'
     */
    name(routeName) {
        registerRoute(routeName, this.path, []);
        return this;
    }
    /**
     * Interpolate {param} placeholders in the path.
     *
     * @example
     * ApiRoutes.users.update.with({ id: 5 }) // '/api/modules/mod.x/users/5'
     */
    with(params) {
        return this.path.replace(/\{(\w+)\}/g, (_, key) => {
            const value = params[key];
            if (value === undefined) {
                throw new Error(`Route "${this.path}" requires param "${key}" but it was not provided.`);
            }
            return String(value);
        });
    }
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
    handler(fn) {
        return {
            path: this.path,
            method: this.method,
            authLevel: this._authLevel,
            rateLimitConfig: this._rateLimitConfig,
            extraProxies: this._extraProxies,
            handler: fn,
        };
    }
    toString() {
        return this.path;
    }
    valueOf() {
        return this.path;
    }
    [Symbol.toPrimitive](_hint) {
        return this.path;
    }
}
