---
title: Security Architecture
sidebar_position: 7
description: Proxy chain authentication, JTI revocation, security headers, and rate limiting.
---

# Security Architecture

Status: Production-ready
Last review: 2026-03-23

Read [Proxy Architecture](./01-architecture.md) first for the route surface map,
trust boundaries, and the explicit list of public-intentional endpoints.

This document covers the layered security model: proxy chain authentication, session revocation, HTTP security headers, and composable rate limiting.

## Proxy chain authentication

All protected routes run through a composable proxy chain. There are four built-in proxy functions in `lib/routing/proxies.ts`:

| Proxy | Use case | Auth failure response |
|-------|----------|-----------------------|
| `proxyAdmin` | Page routes requiring admin session (per `adminAreaRoles`) | Redirect → `/admin/login` |
| `proxyAuth` | Page routes requiring any active session | Redirect → `/sign-in` |
| `proxyApiAdmin` | API route handlers requiring admin session (per `adminAreaRoles`) | `403 Forbidden` JSON |
| `proxyApiAuth` | API route handlers requiring any active session | `401 Unauthorized` JSON |
| `proxyApiRoles(roles)` | Factory: API routes restricted to specific role allowlist | `403 Forbidden` JSON |

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

## JTI revocation and persisted session expiry

Session tokens contain a `jti` (JWT ID) field. The `authSessions` table tracks
every persisted session with its `tokenJti`, `status`, `revokedAt`, and
`expiresAt`. **All four built-in proxies** query this table — if no active
persisted session row is found for the token's JTI, the request is rejected
even if the JWT signature is valid.

| Proxy | JTI check |
|-------|-----------|
| `proxyAdmin` | ✅ `Promise.all([lookupUser, lookupSession])` |
| `proxyAuth` | ✅ `Promise.all([lookupUser, lookupSession])` |
| `proxyApiAdmin` | ✅ `Promise.all([lookupUser, lookupSession])` |
| `proxyApiAuth` | ✅ `Promise.all([lookupUser, lookupSession])` |
| `proxyBuildFormValidateAccess` | ✅ `lookupSession` (+ `lookupUser` for admin forms) |

This ensures that:
- Logout immediately invalidates access (not just at JWT expiry).
- Stolen tokens that are explicitly revoked are blocked within one request.
- Deactivated users lose API access immediately, not at next JWT expiry.
- A stale `auth_sessions` row cannot outlive the cookie refresh path.

If a persisted session row is still marked `active` but its `expiresAt` is now
in the past, the runtime treats it as invalid and marks it `expired` when the
session is checked. This closes the gap where JWT validation and DB lifecycle
could drift apart.

The DB lookups are parallelised with `Promise.all`, so they add only one round-trip of latency.

## Role configuration

Roles are **centralized in `app.config.ts`** — a single source of truth. All proxies, guards, context detection, and form security use `enrichUser(user).isAdmin()` — never hardcode role strings.

```ts
// app.config.ts
roles: {
  adminArea: ['admin'],          // can access /admin + API admin routes (owner is NOT admin)
  dashboardArea: ['member', 'owner'], // can access /dashboard (admin roles implicitly allowed too)

  // Optional: force a role to always resolve to a fixed UserContext,
  // overriding the default team-membership detection.
  contextAffinity: {
    guardian: 'standalone',    // guardian users → always standalone context
    teacher:  'team_member',   // teacher users  → always team context
    staff:    'team_member',   // staff users    → always team context
  }
}
```

**SDK API** (use everywhere — never read `app.config.ts` directly for roles):

```ts
import { enrichUser } from '@skitsaas/sdk';

enrichUser(user).isAdmin()          // role in adminAreaRoles
enrichUser(user).isOwner()          // role === 'owner' (team owner — NOT system admin)
enrichUser(user).isMember()         // role in dashboardAreaRoles ∪ adminAreaRoles
enrichUser(user).hasRole('teacher')
enrichUser(user).canAccess('admin' | 'dashboard')
await enrichUser(user).getContext() // → UserContext (server-side only)
```

`lib/runtime-config/roles.ts` has been **deleted** (SDK v1.5.0). All callers migrated to `enrichUser()`.

`contextAffinity` makes role-to-context mapping explicit. Without an affinity, `getUserContext()` falls back to team-membership detection (unchanged behavior).

## Session refresh

On GET requests through `proxyAdmin` and `proxyAuth`, the session cookie is
refreshed if it is close to expiry. The refreshed cookie is collected by
`executeProxyChain` and merged into the final `NextResponse.next()` — this
ensures the cookie is actually sent to the browser even when multiple proxy
functions run in a chain.

The refreshed token must keep these values aligned:

- JWT `jti`
- payload `sessionId`
- payload `expires`
- persisted `auth_sessions.expiresAt`

If only the JWT `exp` changes but the custom payload `expires` stays stale, the
host will still treat the session as expired. The current runtime now refreshes
both together, and the persisted session row updates `expiresAt`/`lastSeenAt`
at the same time.

## Request correlation

`executeProxyChain(...)` now guarantees an `x-request-id` header on pass-through
and blocking responses. When the inbound request did not already provide one,
the host generates a stable id for that request object and reuses it for auth
audit events emitted during the same proxy execution.

## Auth and session audit events

The current auth lifecycle emits best-effort `sys_activity_logs` records for
high-value security events, including:

- password sign-in success/failure decisions
- session creation and explicit revocation
- invalid or revoked session cookies rejected by page proxies
- API proxy deny decisions (`missing_cookie`, `invalid_cookie`,
  `admin_denied`, `unknown_subject`, `session_revoked`)
- auth provider handoff rate-limit, deny, issue, and verify events

For module auth providers, the core bridge now also promotes the handoff nonce
to the shared `state` contract:

- the `start` bridge injects the nonce into the module request
- the `callback` bridge forwards the verified nonce after the browser-bound
  handoff cookie is checked
- modules can consume both ends through
  `@skitsaas/sdk/server` (`getAuthProviderStartState(...)` and
  `validateAuthProviderCallbackState(...)`)

This telemetry is intentionally best-effort at this layer: request handling does
not fail if the activity-log sink is unavailable.

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

## Form preflight CSRF

The form validation endpoint (`/api/forms/validate`) requires the `Origin` header on every request. Browser `fetch`/`XMLHttpRequest` always includes `Origin` on POST. The check in `lib/forms/security.ts → isTrustedBuildFormPreflightRequest` rejects the request if:

- The `Origin` header is absent (blocks non-browser forged requests).
- `origin.host` does not match the actual request host (blocks cross-origin calls).

This endpoint always lives on the main Next.js app, not a separate API service, so the same-host check works correctly in all deployment topologies.

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

Auth provider handoff routes use this auth-specific limiter for both:

- `/api/auth/providers/[providerId]/start`
- `/api/auth/providers/[providerId]/callback`

In addition to rate limiting, the core auth handoff now issues a short-lived
HTTP-only cookie on `start` and requires that cookie on `callback`. This
browser-bound gate is enforced before module callback dispatch and the cookie is
cleared after callback handling.

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

### Built-in defaults

Two rate limits are active out of the box:

| Scope | Limit | Key | Where configured |
|-------|-------|-----|-----------------|
| All `.auth('user')` API routes | 60 req / 60 s | `userId` or IP | `lib/routing/area-setup.ts` via `proxyRateLimit` |
| Form preflight (`/api/forms/validate`) | 30 req / 60 s | `userId` or IP | `lib/modules/sdk-server-bootstrap.ts` via `configureBuildFormPreflightRateLimit` |

The `proxyRateLimit(config)` factory in `lib/routing/proxies.ts` creates a reusable API proxy:

```ts
import { proxyRateLimit } from '@/lib/routing/proxies'

// Apply a custom limit to a specific route
export const POST = withApiRouteEntries(
  myHandler,
  { preDispatch: [proxyRateLimit({ key: (ctx) => `my-route:${ctx.userId ?? ctx.ip}`, limit: 10, windowSeconds: 60 })] }
)
```

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

The Redis backend is **auto-configured** in `lib/modules/sdk-server-bootstrap.ts` — no manual setup needed. Just set the environment variable:

```
REDIS_URL=redis://...          # or RATE_LIMIT_REDIS_URL for a dedicated instance
```

`createRedisRateLimitBackend()` in `lib/routing/rate-limit-redis.ts` uses an atomic Lua script (INCR + EXPIRE) for a single-round-trip fixed window. It passes `ctx.limit` and `ctx.windowSeconds` from the per-endpoint config, so per-route limits are respected.

Without `REDIS_URL`, the default in-memory sliding window is used (sufficient for single-instance / development).

To use Upstash or a fully custom backend instead, replace the auto-configured call in `sdk-server-bootstrap.ts`:

```ts
import { configureRateLimitBackend } from '@skitsaas/sdk'

configureRateLimitBackend(async (ctx) => {
  // ctx.customKey   — pre-derived bucket key
  // ctx.limit       — max requests for this endpoint
  // ctx.windowSeconds — window for this endpoint
  const { success, reset } = await ratelimit.limit(ctx.customKey!)
  return {
    limited: !success,
    retryAfterSeconds: reset ? Math.ceil((reset - Date.now()) / 1000) : 60
  }
})
```

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
- [ ] `.auth('user')` routes inherit the default 60 req/60 s rate limit automatically — override per-route with `proxyRateLimit(config)` if needed
- [ ] Auth endpoints use `checkAuthRateLimit`
- [ ] Role checks use `enrichUser(user).isAdmin()` / `.hasRole()` — never compare role strings directly
- [ ] Custom roles added to `app.config.ts → roles.adminArea` or `roles.dashboardArea`
- [ ] Context-pinned roles declared in `roles.contextAffinity` if needed
- [ ] API endpoints needing role restriction use `.roles('owner', 'teacher')` on the route builder
- [ ] Production: set `REDIS_URL` to activate distributed rate limiting (auto-configured in `sdk-server-bootstrap.ts`)
