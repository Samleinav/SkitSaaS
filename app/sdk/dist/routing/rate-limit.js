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
const memStore = new Map();
function inMemoryCheck(key, limit, windowMs) {
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
let globalBackend = null;
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
export function configureRateLimitBackend(handler) {
    globalBackend = handler;
}
// ---------------------------------------------------------------------------
// IP resolution
// ---------------------------------------------------------------------------
const IP_HEADERS = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-vercel-forwarded-for', // Vercel
];
/**
 * Extract the best available client IP from request headers.
 * Falls back to '127.0.0.1' in local dev.
 */
export function resolveClientIp(request) {
    for (const header of IP_HEADERS) {
        const value = request.headers.get(header);
        if (value) {
            return value.split(',')[0].trim();
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
export async function checkRateLimit(configOrHandler, request, 
/** Pre-resolved context to merge in before key/limit evaluation. */
extraContext) {
    if (typeof configOrHandler === 'function') {
        const ctx = {
            ip: resolveClientIp(request),
            endpoint: new URL(request.url).pathname,
            method: request.method,
            ...extraContext
        };
        return configOrHandler(ctx);
    }
    const config = configOrHandler;
    let ctx = {
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
        return globalBackend({ ...ctx, customKey: ctx.customKey ?? key });
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
export function withRateLimit(configOrHandler, next) {
    return async (request, context) => {
        const result = await checkRateLimit(configOrHandler, request);
        if (result.limited) {
            return Response.json({ error: 'Too many requests. Please try again later.' }, {
                status: 429,
                headers: { 'Retry-After': String(result.retryAfterSeconds ?? 60) }
            });
        }
        return next(request, context);
    };
}
