---
title: Security Architecture
sidebar_position: 7
description: Proxy chain authentication, JTI revocation, security headers, and rate limiting.
---

# Security Architecture

Status: Production-ready
Last review: 2026-03-08

This document covers the layered security model: proxy chain authentication, session revocation, HTTP security headers, and composable rate limiting.

## Proxy chain authentication

All protected routes run through a composable proxy chain. There are four built-in proxy functions in `lib/routing/proxies.ts`:

| Proxy | Use case | Auth failure response |
|-------|----------|-----------------------|
| `proxyAdmin` | Page routes requiring admin or owner session | Redirect → `/admin/login` |
| `proxyAuth` | Page routes requiring any active session | Redirect → `/sign-in` |
| `proxyApiAdmin` | API route handlers requiring admin or owner session | `403 Forbidden` JSON |
| `proxyApiAuth` | API route handlers requiring any active session | `401 Unauthorized` JSON |

### How proxy.ts resolves chains

`proxy.ts` (Next.js v16+ middleware equivalent) imports `lib/routing/all-routes.ts` at startup, which registers all named routes. On each incoming request:

1. `matchRouteProxyChain(pathname)` does a longest-prefix match against registered routes.
2. Returns the matched route's `allProxies` (area defaults + per-route extras).
3. Falls back to area defaults if no named route matches:
   - `/admin/*` → `[proxyAdmin]`
   - `/dashboard/*` → `[proxyAuth]`

Every unregistered admin/dashboard path is therefore still protected by its area default — there is no unguarded path in those areas.

### Proxy function contract

```ts
type RouteProxyFn = (request: NextRequest) => Promise<NextResponse | null>
// null  → continue to the next proxy in the chain
// Response → short-circuit (redirect, JSON error, etc.)
```

### Protecting API route handlers

`/api` is excluded from `proxy.ts` to avoid intercepting public webhooks. Protect
API handlers at the handler level. For typed core/module API routes, prefer
`RouteApi(...).METHOD().auth().proxy()` plus `dispatchApiRoutes()` or the host
helper `withApiRouteEntries(...)`:

```ts
import { RouteApi } from '@skitsaas/sdk'
import { withApiRouteEntries } from '@/lib/routing/with-api-route'

const usersGet = RouteApi('/admin/users').GET().auth('admin').handler(async () => {
  return Response.json({ data: [] })
})

export const GET = withApiRouteEntries(usersGet)
```

`withApiProxy([proxyApiAdmin | proxyApiAuth], handler)` remains available for
small standalone handlers.

## JTI revocation

Session tokens contain a `jti` (JWT ID) field. The `authSessions` table tracks every active session with its `tokenJti`, `status`, and `revokedAt`. Both `proxyAdmin` and `proxyAuth` query this table on every protected request — if no active session row is found for the token's JTI, the request is rejected even if the JWT signature is valid.

This ensures that:
- Logout immediately invalidates access (not just at JWT expiry).
- Stolen tokens that are explicitly revoked are blocked within one request.

The lookup is done in `Promise.all` with the user DB lookup, so it adds minimal latency.

## Session refresh

On GET requests through `proxyAdmin` and `proxyAuth`, the session cookie is refreshed if it is close to expiry. The refreshed cookie is collected by `executeProxyChain` and merged into the final `NextResponse.next()` — this ensures the cookie is actually sent to the browser even when multiple proxy functions run in a chain.

## Security headers

Security headers are set globally in `next.config.mjs` for all routes (`source: '/(.*)'`):

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | See below |

**CSP directives:**
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev only)
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob: https:`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- `object-src 'none'`

## Rate limiting

Rate limiting is SDK-first — available to core host and all module types without any `@/lib/*` dependency.

### Import

```ts
// Modules and shared code — works everywhere
import { withRateLimit, configureRateLimitBackend } from '@skitsaas/sdk'

// Core host only — adds automatic userId extraction from JWT (no DB)
import { withRateLimit, checkRateLimit } from '@/lib/routing/rate-limit'

// Auth endpoints specifically
import { checkAuthRateLimit } from '@/lib/auth/rate-limit'
```

### Available context fields

| Field | Always available | Source |
|-------|-----------------|--------|
| `ip` | ✅ | Headers (x-forwarded-for, cf-connecting-ip, etc.) |
| `endpoint` | ✅ | `request.url` pathname |
| `method` | ✅ | `request.method` |
| `userId` | ⚠️ host only (JWT decode) or via `resolveContext` | JWT or hook |
| `role` | ❌ requires `resolveContext` | DB lookup |
| `plan` | ❌ requires `resolveContext` | DB lookup |
| `customKey` | ❌ requires `resolveContext` | Custom |

### Usage patterns

**Per-IP (default, no config):**
```ts
export const POST = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  handler
)
```

**Per plan (from module):**
```ts
import { withRateLimit } from '@skitsaas/sdk'
import { getUser, getAdminDb } from '@skitsaas/sdk/server'

export const POST = withRateLimit(
  {
    key: (ctx) => `${ctx.userId ?? ctx.ip}:endpoint`,
    limit: (ctx) => ({ pro: 1000, basic: 200, free: 20 }[ctx.plan ?? 'free'] ?? 20),
    windowSeconds: 3600,
    resolveContext: async (request) => {
      const user = await getUser()
      if (!user?.id) return {}
      const db = await getAdminDb()
      const row = await db.query.subscriptionAssignments.findFirst({
        where: (t, { eq }) => eq(t.userId, user.id),
        columns: { planSlug: true }
      })
      return { plan: row?.planSlug ?? 'free' }
    }
  },
  handler
)
```

**Rate limit + API auth together** (rate limit outermost — cheaper check first):
```ts
export const POST = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  withApiProxy([proxyApiAdmin], handler)
)
```

### Auth rate limiting

Auth endpoints (`/api/auth/*/start`, `/api/auth/*/callback`) apply a separate tighter limit: **10 requests per IP per minute**. This is enforced in the route handler via `checkAuthRateLimit` from `lib/auth/rate-limit`.

### Production backend (Redis / Upstash)

Configure once at bootstrap — covers all `withRateLimit` usages across core and all modules:

```ts
// lib/modules/sdk-server-bootstrap.ts
import { configureRateLimitBackend } from '@skitsaas/sdk'

configureRateLimitBackend(async (ctx) => {
  const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`
  const { success, reset } = await ratelimit.limit(key)
  return {
    limited: !success,
    retryAfterSeconds: reset ? Math.ceil((reset - Date.now()) / 1000) : 60
  }
})
```

Without this, the default in-memory sliding window is used (sufficient for single-instance / development).

## Composing proxy extras per route

Named routes can carry additional proxy functions beyond their area default:

```ts
// core/routes.ts
RouteAdmin('/premium-feature')
  .proxy([proxyFeatureFlag('premium')])
  .name('admin.premium-feature')
// chain: proxyAdmin → proxyFeatureFlag
```

Custom proxy functions live in `lib/routing/proxies.ts` and must follow the `RouteProxyFn` contract: return `null` to continue, return a `Response` to short-circuit.

## Security checklist for new routes

- [ ] Page routes under `/admin/*` or `/dashboard/*` are protected by area defaults automatically
- [ ] API route handlers use `RouteApi(...).auth().proxy()` + `withApiRouteEntries(...)` or `withApiProxy(...)`
- [ ] Rate limiting applied with `withRateLimit` (SDK) — outermost wrapper
- [ ] Auth endpoints use `checkAuthRateLimit`
- [ ] Production: `configureRateLimitBackend` configured with Redis in bootstrap
