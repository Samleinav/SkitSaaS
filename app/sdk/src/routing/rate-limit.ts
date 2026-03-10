/**
 * SDK-level rate limiting — usable from core and all module types
 * (source-host, source-package, prebuilt).
 *
 * No host dependencies. The distributed backend is injected via
 * configureRateLimitBackend() — call it once at bootstrap in the host project.
 *
 * Context available without any config:
 *   ip, endpoint, method
 *
 * Context requiring host injection (resolveContext hook or configured backend):
 *   userId, role, plan, customKey
 *
 * ---
 *
 * In-module usage (source-package or source-host):
 *
 *   import { withRateLimit } from '@skitsaas/sdk'
 *
 *   // Per IP + endpoint (default)
 *   handler = withRateLimit({ limit: 5, windowSeconds: 60 }, handler)
 *
 *   // Per plan — requires resolveContext to look up the plan
 *   handler = withRateLimit(
 *     {
 *       key: (ctx) => `${ctx.userId ?? ctx.ip}:my-endpoint`,
 *       limit: (ctx) => ({ pro: 1000, basic: 200, free: 20 }[ctx.plan ?? 'free'] ?? 20),
 *       windowSeconds: 3600,
 *       resolveContext: async (req) => {
 *         // source-package: use getUser() / getDb() from @skitsaas/sdk/server
 *         const user = await getUser()
 *         const plan = await getUserPlan(user?.id)
 *         return { plan }
 *       }
 *     },
 *     handler
 *   )
 *
 *   // Custom (full control)
 *   handler = withRateLimit(async (ctx) => {
 *     const count = await myRedis.incr(`rl:${ctx.ip}`)
 *     return { limited: count > 10 }
 *   }, handler)
 *
 * In-host bootstrap (lib/modules/sdk-server-bootstrap.ts or similar):
 *
 *   import { configureRateLimitBackend } from '@skitsaas/sdk'
 *
 *   configureRateLimitBackend(async (ctx) => {
 *     const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
 *     const count = await redis.incr(key)
 *     if (count === 1) await redis.expire(key, 60)
 *     return { limited: count > 50 }
 *   })
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitContext = {
  /** Client IP resolved from request headers. */
  ip: string;
  /** Request pathname, e.g. "/api/modules/my-module/items" */
  endpoint: string;
  /** HTTP method */
  method: string;
  /**
   * Authenticated user ID.
   * In the host's extended version (lib/routing/rate-limit.ts), this is
   * decoded from the session JWT automatically. In the SDK version, populate
   * it via resolveContext() or via the configured backend.
   */
  userId?: number;
  /** User role — populate via resolveContext() when needed. */
  role?: string;
  /** Subscription plan slug — populate via resolveContext() when needed. */
  plan?: string;
  /**
   * Arbitrary key override. Derived keys from config.key() are passed here
   * when delegating to the global backend, so the backend can use them
   * directly without re-deriving the key.
   */
  customKey?: string;
};

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds?: number;
};

/** Fully custom handler — receives full context, returns limit decision. */
export type RateLimitHandler = (
  ctx: RateLimitContext
) => Promise<RateLimitResult>;

/**
 * Extended context passed to a globally configured backend.
 * Includes the evaluated `limit` and `windowSeconds` from the per-endpoint
 * config so the backend can implement the correct window without re-deriving them.
 */
export type RateLimitBackendContext = RateLimitContext & {
  /** Max requests allowed in the window (already evaluated for dynamic limits). */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
};

/** Handler signature for configureRateLimitBackend(). */
export type RateLimitBackendHandler = (
  ctx: RateLimitBackendContext
) => Promise<RateLimitResult>;

/** Declarative config for common rate limit patterns. */
export type RateLimitConfig = {
  /**
   * Derive the bucket key from context.
   * Default: `"${ip}:${endpoint}"` — per-IP per-endpoint.
   *
   * @example per-user:  (ctx) => `${ctx.userId ?? ctx.ip}`
   * @example per-plan:  (ctx) => `${ctx.userId}:plan`
   */
  key?: (ctx: RateLimitContext) => string;

  /**
   * Max requests allowed in the window.
   * Can be a number or a function for dynamic limits (e.g. per plan/role).
   *
   * @example (ctx) => ({ pro: 1000, basic: 200, free: 20 }[ctx.plan ?? 'free'] ?? 20)
   */
  limit: number | ((ctx: RateLimitContext) => number);

  /** Window size in seconds. */
  windowSeconds: number;

  /**
   * Optional async hook to enrich the context before key/limit functions run.
   * Use this to populate role, plan, or customKey from your data source.
   *
   * Runs once per request, in the critical path before the handler.
   * Keep it fast.
   *
   * From a source-package module:
   *   import { getUser, getAdminDb } from '@skitsaas/sdk/server'
   *
   * @example
   *   resolveContext: async (req) => {
   *     const user = await getUser()
   *     const plan = await lookupPlan(user?.id)
   *     return { plan }
   *   }
   */
  resolveContext?: (
    request: Request
  ) => Promise<Partial<Pick<RateLimitContext, 'userId' | 'role' | 'plan' | 'customKey'>>>;
};

type ApiHandler = (request: Request, context?: unknown) => Promise<Response>;

// ---------------------------------------------------------------------------
// In-memory default backend (sliding window, per-bucket)
// Single-instance only — override with configureRateLimitBackend for production.
// ---------------------------------------------------------------------------

type MemEntry = { count: number; windowStart: number };
const memStore = new Map<string, MemEntry>();

function inMemoryCheck(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    memStore.set(key, { count: 1, windowStart: now });
    return { limited: false };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const remainingMs = windowMs - (now - entry.windowStart);
    return { limited: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }

  return { limited: false };
}

// ---------------------------------------------------------------------------
// Global backend registry
// ---------------------------------------------------------------------------

let globalBackend: RateLimitBackendHandler | null = null;

/**
 * Inject a distributed rate limit backend (Redis, Upstash, Vercel KV, etc.).
 *
 * Call once at application bootstrap. Covers ALL withRateLimit usages
 * across core and modules when the in-memory default is insufficient.
 *
 * The context passed to the backend includes:
 *  - `customKey`    — pre-derived bucket key from the config's key() function
 *  - `limit`        — evaluated max requests (already resolved for dynamic limits)
 *  - `windowSeconds`— window size from the per-endpoint config
 *
 * @example — Redis fixed-window via createRedisRateLimitBackend()
 * import { createRedisRateLimitBackend } from '@/lib/routing/rate-limit-redis'
 * configureRateLimitBackend(createRedisRateLimitBackend())
 *
 * @example — Upstash Ratelimit
 * configureRateLimitBackend(async (ctx) => {
 *   const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
 *   const { success, reset } = await ratelimit.limit(key)
 *   return { limited: !success, retryAfterSeconds: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 }
 * })
 */
export function configureRateLimitBackend(handler: RateLimitBackendHandler): void {
  globalBackend = handler;
}

// ---------------------------------------------------------------------------
// IP resolution
// ---------------------------------------------------------------------------

const IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',   // Cloudflare
  'x-vercel-forwarded-for', // Vercel
];

/**
 * Extract the best available client IP from request headers.
 * Falls back to '127.0.0.1' in local dev.
 */
export function resolveClientIp(request: Request): string {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0]!.trim();
    }
  }

  return '127.0.0.1';
}

// ---------------------------------------------------------------------------
// Core evaluation (exported for host extensions like lib/routing/rate-limit.ts)
// ---------------------------------------------------------------------------

/**
 * Evaluate a rate limit config/handler against a request.
 *
 * Exported so host-level wrappers (e.g. lib/routing/rate-limit.ts) can call
 * it after enriching the context with host-specific data (JWT userId, etc.).
 */
export async function checkRateLimit(
  configOrHandler: RateLimitConfig | RateLimitHandler,
  request: Request,
  /** Pre-resolved context to merge in before key/limit evaluation. */
  extraContext?: Partial<RateLimitContext>
): Promise<RateLimitResult> {
  if (typeof configOrHandler === 'function') {
    const ctx: RateLimitContext = {
      ip: resolveClientIp(request),
      endpoint: new URL(request.url).pathname,
      method: request.method,
      ...extraContext
    };
    return configOrHandler(ctx);
  }

  const config = configOrHandler;
  let ctx: RateLimitContext = {
    ip: resolveClientIp(request),
    endpoint: new URL(request.url).pathname,
    method: request.method,
    ...extraContext
  };

  if (config.resolveContext) {
    const extra = await config.resolveContext(request);
    ctx = { ...ctx, ...extra };
  }

  const key = config.key ? config.key(ctx) : `${ctx.ip}:${ctx.endpoint}`;
  const limit = typeof config.limit === 'function' ? config.limit(ctx) : config.limit;
  const windowMs = config.windowSeconds * 1000;

  if (globalBackend) {
    return globalBackend({
      ...ctx,
      customKey: ctx.customKey ?? key,
      limit,
      windowSeconds: config.windowSeconds,
    });
  }

  return inMemoryCheck(key, limit, windowMs);
}

// ---------------------------------------------------------------------------
// withRateLimit — composable handler wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap a Next.js / module API route handler with rate limiting.
 *
 * Composes with withApiProxy — put withRateLimit outermost (cheaper check first):
 *
 *   export const POST = withRateLimit(
 *     { limit: 10, windowSeconds: 60 },
 *     withApiProxy([proxyApiAuth], handler)   // host only
 *   )
 *
 * Or in a module using createModuleApiRouter's handler field:
 *
 *   handler: withRateLimit({ limit: 5, windowSeconds: 60 }, myHandler)
 */
export function withRateLimit(
  configOrHandler: RateLimitConfig | RateLimitHandler,
  next: ApiHandler
): ApiHandler {
  return async (request: Request, context?: unknown) => {
    const result = await checkRateLimit(configOrHandler, request);

    if (result.limited) {
      return Response.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) }
        }
      );
    }

    return next(request, context);
  };
}
