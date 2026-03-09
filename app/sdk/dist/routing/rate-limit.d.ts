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
export type RateLimitHandler = (ctx: RateLimitContext) => Promise<RateLimitResult>;
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
    resolveContext?: (request: Request) => Promise<Partial<Pick<RateLimitContext, 'userId' | 'role' | 'plan' | 'customKey'>>>;
};
type ApiHandler = (request: Request, context?: unknown) => Promise<Response>;
/**
 * Inject a distributed rate limit backend (Redis, Upstash, Vercel KV, etc.).
 *
 * Call once at application bootstrap. Covers ALL withRateLimit usages
 * across core and modules when the in-memory default is insufficient.
 *
 * The context passed to the backend always includes `customKey`, which is
 * the pre-derived bucket key from the config's key() function — so you
 * don't need to re-derive it in the backend.
 *
 * @example — Upstash Redis sliding window
 * configureRateLimitBackend(async (ctx) => {
 *   const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
 *   const { success, reset } = await ratelimit.limit(key)
 *   return { limited: !success, retryAfterSeconds: reset ? Math.ceil((reset - Date.now()) / 1000) : 60 }
 * })
 */
export declare function configureRateLimitBackend(handler: RateLimitHandler): void;
/**
 * Extract the best available client IP from request headers.
 * Falls back to '127.0.0.1' in local dev.
 */
export declare function resolveClientIp(request: Request): string;
/**
 * Evaluate a rate limit config/handler against a request.
 *
 * Exported so host-level wrappers (e.g. lib/routing/rate-limit.ts) can call
 * it after enriching the context with host-specific data (JWT userId, etc.).
 */
export declare function checkRateLimit(configOrHandler: RateLimitConfig | RateLimitHandler, request: Request, 
/** Pre-resolved context to merge in before key/limit evaluation. */
extraContext?: Partial<RateLimitContext>): Promise<RateLimitResult>;
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
export declare function withRateLimit(configOrHandler: RateLimitConfig | RateLimitHandler, next: ApiHandler): ApiHandler;
export {};
