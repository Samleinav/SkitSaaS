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
import { checkRateLimit } from './rate-limit.js';
import { registerRoute } from './registry.js';
import { RouteBuilder } from './builder.js';
import type { RouteProxyFn, RouteParamMap } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
export type ApiHandlerFn = (
  request: Request,
  params: Record<string, string>
) => Response | Promise<Response>;

/**
 * A fully resolved API route entry — ready for dispatch.
 * Created by calling ApiMethodRouteBuilder.handler(fn) in manifest.ts.
 */
export type ApiRouteEntry = {
  path: string;
  method: HttpMethod;
  authLevel: ApiAuthLevel;
  /**
   * Optional role allowlist. When set, only authenticated users whose role is
   * in this list can access the route (checked after the auth proxy).
   * Requires configureApiAuthProxies({ roleCheck }) to be configured.
   *
   * @example
   * RouteApi('/modules/mod.x/owner-reports').GET().auth('user').roles('owner', 'teacher')
   */
  roles?: string[];
  rateLimitConfig?: RateLimitConfig;
  extraProxies: ApiRouteProxyFn[];
  handler: ApiHandlerFn;
};

// ---------------------------------------------------------------------------
// Auth proxy injection (DI from host project)
// ---------------------------------------------------------------------------

type ApiAuthConfig = {
  user: ApiRouteProxyFn | null;
  admin: ApiRouteProxyFn | null;
  /**
   * Factory that creates a role-check proxy for a given allowlist.
   * Inject via configureApiAuthProxies({ roleCheck: (roles) => proxyApiRoles(roles) }).
   * Runs after the auth proxy in the chain.
   */
  roleCheck: ((allowedRoles: string[]) => ApiRouteProxyFn) | null;
};

const apiAuthConfig: ApiAuthConfig = {
  user: null,
  admin: null,
  roleCheck: null,
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
export function configureApiAuthProxies(config: Partial<ApiAuthConfig>): void {
  if (config.user !== undefined) apiAuthConfig.user = config.user;
  if (config.admin !== undefined) apiAuthConfig.admin = config.admin;
  if (config.roleCheck !== undefined) apiAuthConfig.roleCheck = config.roleCheck;
}

export function getApiAuthConfig(): Readonly<ApiAuthConfig> {
  return apiAuthConfig;
}

// ---------------------------------------------------------------------------
// CORS configuration (for cross-origin / multi-service API deployments)
// ---------------------------------------------------------------------------

type ApiCorsConfig = {
  /** Origins allowed to call the API cross-origin. Use ['*'] for fully public APIs. */
  allowedOrigins: string[];
  /** Request headers allowed. Default covers the common set. */
  allowedHeaders: string[];
  /** Preflight cache duration in seconds. Default: 86400 (24 h). */
  maxAge: number;
};

const apiCorsConfig: ApiCorsConfig = {
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
export function configureApiCors(config: Partial<ApiCorsConfig>): void {
  if (config.allowedOrigins !== undefined) apiCorsConfig.allowedOrigins = config.allowedOrigins;
  if (config.allowedHeaders !== undefined) apiCorsConfig.allowedHeaders = config.allowedHeaders;
  if (config.maxAge !== undefined) apiCorsConfig.maxAge = config.maxAge;
}

export function getApiCorsConfig(): Readonly<ApiCorsConfig> {
  return apiCorsConfig;
}

function buildCorsHeaders(requestOrigin: string | null): Record<string, string> {
  if (!apiCorsConfig.allowedOrigins.length) return {};

  const isWildcard = apiCorsConfig.allowedOrigins.includes('*');
  const originAllowed =
    isWildcard ||
    (requestOrigin !== null && apiCorsConfig.allowedOrigins.includes(requestOrigin));

  if (!originAllowed) return {};

  const allowOrigin = isWildcard ? '*' : (requestOrigin as string);
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
export function matchApiPath(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const paramNames: string[] = [];
  const regexSource = pattern.replace(/\{(\w+)\}/g, (_, name: string) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexSource}$`);
  const match = regex.exec(pathname);
  if (!match) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]!] = match[i + 1]!;
  }
  return params;
}

// ---------------------------------------------------------------------------
// Rate limit → ApiRouteProxyFn adapter
// ---------------------------------------------------------------------------

function makeRateLimitProxy(config: RateLimitConfig): ApiRouteProxyFn {
  return async (request: Request): Promise<Response | null> => {
    const result = await checkRateLimit(config, request);
    if (!result.limited) return null;
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) }
      }
    );
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
export async function dispatchApiRoutes(
  routes: ApiRouteEntry[],
  request: Request
): Promise<Response | null> {
  const rawMethod = request.method.toUpperCase();
  const method = rawMethod as HttpMethod;
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
    if (entry.method !== method) continue;

    // entry.path may be a full URL when a cross-origin base is configured.
    // Always compare only the pathname portion.
    const entryPathname = entry.path.startsWith('http')
      ? new URL(entry.path).pathname
      : entry.path;

    const params = matchApiPath(entryPathname, pathname);
    if (params === null) continue;

    // Build proxy chain
    const proxies: ApiRouteProxyFn[] = [];

    // 1. Rate limit first — cheapest, no auth dependency
    if (entry.rateLimitConfig) {
      proxies.push(makeRateLimitProxy(entry.rateLimitConfig));
    }

    // 2. Auth proxy — resolved lazily so import order doesn't matter
    if (entry.authLevel === 'admin' && apiAuthConfig.admin) {
      proxies.push(apiAuthConfig.admin);
    } else if (entry.authLevel === 'user' && apiAuthConfig.user) {
      proxies.push(apiAuthConfig.user);
    }

    // 2b. Role check — runs after auth, only when roles allowlist is set
    if (entry.roles?.length && apiAuthConfig.roleCheck) {
      proxies.push(apiAuthConfig.roleCheck(entry.roles));
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

function addCorsHeaders(
  response: Response,
  corsHeaders: Record<string, string>
): Response {
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
  override proxy(fns: RouteProxyFn[]): ApiRouteBuilder {
    return new ApiRouteBuilder(this.path, this.defaultProxies, [
      ...this.extraProxies,
      ...fns
    ]);
  }

  /** Create a GET route entry for this path. */
  GET(): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(this.path, 'GET');
  }

  /** Create a POST route entry for this path. */
  POST(): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(this.path, 'POST');
  }

  /** Create a PUT route entry for this path. */
  PUT(): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(this.path, 'PUT');
  }

  /** Create a PATCH route entry for this path. */
  PATCH(): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(this.path, 'PATCH');
  }

  /** Create a DELETE route entry for this path. */
  DELETE(): ApiMethodRouteBuilder {
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
  readonly path: string;
  readonly method: HttpMethod;
  private readonly _authLevel: ApiAuthLevel;
  private readonly _rateLimitConfig?: RateLimitConfig;
  private readonly _extraProxies: ApiRouteProxyFn[];
  private readonly _roles: string[];

  constructor(
    path: string,
    method: HttpMethod,
    authLevel: ApiAuthLevel = 'none',
    rateLimitConfig?: RateLimitConfig,
    extraProxies: ApiRouteProxyFn[] = [],
    roles: string[] = []
  ) {
    this.path = path;
    this.method = method;
    this._authLevel = authLevel;
    this._rateLimitConfig = rateLimitConfig;
    this._extraProxies = extraProxies;
    this._roles = roles;
  }

  /**
   * Set the authentication requirement for this route.
   *
   * - 'none'  — public (default)
   * - 'user'  — requires active session; uses proxy injected via configureApiAuthProxies
   * - 'admin' — requires admin/owner session; uses proxy injected via configureApiAuthProxies
   */
  auth(level: ApiAuthLevel): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(
      this.path,
      this.method,
      level,
      this._rateLimitConfig,
      this._extraProxies,
      this._roles
    );
  }

  /**
   * Add rate limiting to this route.
   * Rate limit runs first in the proxy chain (before auth — cheapest check first).
   *
   * @example
   * RouteApi('/modules/mod.x/export').POST().auth('user').rateLimit({
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
  rateLimit(config: RateLimitConfig): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(
      this.path,
      this.method,
      this._authLevel,
      config,
      this._extraProxies,
      this._roles
    );
  }

  /**
   * Add extra proxy functions (feature flags, custom guards, quota checks, etc.).
   * These run after rate-limit and auth in the proxy chain.
   *
   * @example
   * .proxy([proxyFeatureFlag('premium'), proxyQuota('exports')])
   */
  proxy(fns: ApiRouteProxyFn[]): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(
      this.path,
      this.method,
      this._authLevel,
      this._rateLimitConfig,
      [...this._extraProxies, ...fns],
      this._roles
    );
  }

  /**
   * Restrict this route to users whose role is in the allowlist.
   * Requires auth('user') or auth('admin') — role check runs after auth.
   * Requires configureApiAuthProxies({ roleCheck }) in area-setup.ts.
   *
   * @example
   * RouteApi('/modules/mod.school/reports').GET().auth('user').roles('owner', 'teacher')
   */
  roles(...allowedRoles: string[]): ApiMethodRouteBuilder {
    return new ApiMethodRouteBuilder(
      this.path,
      this.method,
      this._authLevel,
      this._rateLimitConfig,
      this._extraProxies,
      allowedRoles
    );
  }

  /**
   * Register this route in the named route registry for URL construction.
   * Returns `this` for chaining.
   *
   * @example
   * RouteApi('/modules/mod.x/users').GET().auth('user').name('mod.x.api.users.list')
   * route('mod.x.api.users.list') // '/api/modules/mod.x/users'
   */
  name(routeName: string): this {
    registerRoute(routeName, this.path, []);
    return this;
  }

  /**
   * Interpolate {param} placeholders in the path.
   *
   * @example
   * ApiRoutes.users.update.with({ id: 5 }) // '/api/modules/mod.x/users/5'
   */
  with(params: RouteParamMap): string {
    return this.path.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error(
          `Route "${this.path}" requires param "${key}" but it was not provided.`
        );
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
  handler(fn: ApiHandlerFn): ApiRouteEntry {
    return {
      path: this.path,
      method: this.method,
      authLevel: this._authLevel,
      ...(this._roles.length ? { roles: this._roles } : {}),
      rateLimitConfig: this._rateLimitConfig,
      extraProxies: this._extraProxies,
      handler: fn,
    };
  }

  toString(): string {
    return this.path;
  }

  valueOf(): string {
    return this.path;
  }

  [Symbol.toPrimitive](_hint: string): string {
    return this.path;
  }
}
