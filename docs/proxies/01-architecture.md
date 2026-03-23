---
title: Proxy Architecture
sidebar_position: 6
description: Request-flow and trust-boundary map for pages, portals, core APIs, and module APIs.
---

# Proxy Architecture

Status: In use
Last review: 2026-03-23

Read this page before [Security Architecture](./02-security.md). This document
explains where enforcement happens; the security page explains what each guard
checks.

## Why this page exists

The routing model in this project has two different enforcement paths:

- page and portal traffic goes through `proxy.ts`
- `/api/*` does not

That split is intentional. Without documenting it explicitly, it is easy to
assume that every protected surface is covered by the same middleware layer.

## Current route surfaces

| Surface | Entry path shape | Enforcement entrypoint |
|---|---|---|
| Core admin pages | `/admin/*` | `proxy.ts` -> `matchRouteProxyChain(...)` |
| Core dashboard pages | `/dashboard/*` | `proxy.ts` -> `matchRouteProxyChain(...)` |
| Frontend pages | `/`, `/pricing`, `/checkout/*`, auth pages | `proxy.ts` only when route metadata or area defaults require it |
| Portal pages | `/<portal>/*`, `/dashboard/<portal>/*` | `proxy.ts` first, then rewrite to `/portal-internal/*` |
| Core API routes | `/api/*` | `withApiRouteEntries(...)`, `withApiProxy(...)`, or typed `dispatchApiRoutes()` |
| Module API routes | `/api/modules/[moduleId]/[[...slug]]` | module runtime via `resolveModuleApiHandler(...)` |
| Module page dispatchers | `/admin/modules/*`, `/dashboard/modules/*`, `/modules/*`, aliases | `proxy.ts` for page access + runtime dispatch |
| Internal portal dispatcher | `/portal-internal/*` | blocked directly in `proxy.ts` |

## Boot sequence

The protection model depends on route metadata being registered before requests
arrive.

1. `proxy.ts` imports `@/lib/routing/all-routes`.
2. `lib/routing/all-routes.ts` imports:
   - `@/core/routes`
   - generated module route registrations
3. `@/core/routes` imports `@/lib/routing/area-setup` first.
4. `lib/routing/area-setup.ts` configures:
   - area defaults
   - API auth proxies for typed `RouteApi(...).auth(...)`
   - area base URLs
   - route-builder role proxies

That means route builders capture proxy defaults at registration time, not later.

## Area defaults

Current defaults are configured in `lib/routing/area-setup.ts`:

- `admin` -> `[proxyAdmin]`
- `dashboard` -> `[proxyAuth]`

There is no blanket default for `frontend`, because frontend routes mix public,
user-only, and admin-only access depending on page or module contract.

## Page and portal request flow

For page-like traffic, the flow is:

1. request enters `proxy.ts`
2. surface-mode gating runs first (`admin-only`, `dashboard-only`, etc.)
3. direct access to `/portal-internal/*` is denied
4. `matchRouteProxyChain(pathname)` resolves:
   - named route chain, or
   - area default fallback
5. `executeProxyChain(...)` runs the chain
6. if the path is a portal route, the request is rewritten to
   `/portal-internal/*` only after the chain passes
7. cookies refreshed by the chain are forwarded into the final response

Important consequence:

- unregistered `/admin/*` paths still inherit `[proxyAdmin]`
- unregistered `/dashboard/*` paths still inherit `[proxyAuth]`

## Why `/api/*` does not go through `proxy.ts`

`proxy.ts` uses this matcher:

```ts
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

`/api/*` is excluded on purpose so the system can support:

- payment provider webhooks
- third-party auth callbacks
- payment return URLs
- route-level API auth and rate limits

If `/api/*` went through the same page proxy chain by default, many public
provider integrations would break.

## API request flow

For core APIs, protection is handler-level:

- typed routes use `RouteApi(...).METHOD().auth().rateLimit().proxy()`
- bridge files wrap them with `withApiRouteEntries(...)`
- small standalone handlers can use `withApiProxy([...], handler)`

For module APIs:

- `/api/modules/[moduleId]/[[...slug]]` does not use `withApiRouteEntries(...)`
- it delegates to `resolveModuleApiHandler(...)`
- the module route contract itself decides auth, roles, rate limits, and extra proxies

This is not an unguarded bypass. It is a separate dispatcher path with its own
contract.

## Trust boundaries

| Boundary | Main risk | Canonical control |
|---|---|---|
| Browser -> page/portal | unauthenticated access to private UI | `proxy.ts` + area defaults + route chain |
| Browser -> core API | raw HTTP bypassing UI checks | typed API route auth/rate limit/proxies |
| Provider -> webhook/return URL | forged callbacks or replay | signature verification and route-level rate limits |
| Browser -> form preflight | cross-origin abuse | same-origin checks + conditional auth preDispatch |
| Browser -> sfiles serve | direct file access | public visibility or actor/permission checks |
| Browser -> module API/page | module-specific bypass | module route contract + runtime dispatcher |

## Public-intentional allowlist

These routes are expected to be reachable without a logged-in browser session,
but only because a different control model applies.

The allowlist is now enforced by test coverage in:

- `tests/routing/api-route-coverage.test.ts`
- `tests/auth/proxy-guards.test.ts`

### Public sessionless endpoints

- `/api/auth/providers/[providerId]/start`
  - public by design
  - auth provider handoff
  - auth-specific rate limiting
- `/api/auth/providers/[providerId]/callback`
  - public by design
  - third-party provider callback
- `/api/auth/sign-out`
  - no auth requirement
  - allows clearing expired or partially invalid sessions
- `/api/checkout/methods/[paymentMethodId]/return`
  - payment return handoff
  - rate-limited
- `/api/checkout/methods/[paymentMethodId]/webhook`
  - provider webhook
  - rate-limited
  - handler signature validation required
- `/api/stripe/checkout`
  - legacy compatibility return flow
  - rate-limited
- `/api/stripe/webhook`
  - legacy compatibility webhook
  - rate-limited
  - signature validation required
- `/api/paypal/webhook`
  - legacy compatibility webhook
  - rate-limited
  - signature validation required

### Public but not anonymous in the general sense

- `/api/forms/validate`
  - not behind `proxy.ts`
  - protected by same-origin and conditional access checks
- `/api/sfiles/serve/[...path]`
  - public only when the file record visibility is `public`
  - otherwise actor and permission checks apply
- `/api/checkout/methods/[paymentMethodId]/cancel`
  - no blanket session auth at route metadata level
  - handler decides access from payment-order context

### Hybrid dispatcher surface

- `/api/modules/[moduleId]/[[...slug]]`
  - not public by default
  - not protected by host `proxy.ts`
  - protected by module route metadata or legacy module router contract

## Surfaces that should stay protected by default

These surfaces should never rely on “security by not being linked”:

- `/admin/*`
- `/dashboard/*`
- portal routes
- `/api/user`
- `/api/team`
- `/api/notifications/*`
- `/api/checkout/[checkoutToken]/pay/[paymentMethodId]`
- `/api/checkout/methods`
- `/api/paypal/plan`
- `/api/paypal/checkout`
- `/api/paypal/checkout/cancel`
- `/api/sfiles*` except the public-file branch of `serve`

## Module-specific notes

- page dispatchers are protected first by `proxy.ts`, then resolved by the runtime
- API dispatchers skip `proxy.ts`, but auth still comes from module route
  metadata (`apiRoutes`) or `createModuleApiRouter(...)`
- frontend module aliases can still be public, user-only, or admin-only based on
  module contract

## Verification commands

```bash
find app/api -name 'route.ts' | sort
rg -n "withApiRouteEntries|withApiProxy|dispatchApiRoutes|matchRouteProxyChain|configureAreaDefaults" app lib core
npx tsx --test tests/routing/api-route-coverage.test.ts tests/auth/proxy-guards.test.ts
pnpm docs:check:paths
pnpm docs:check:links
```
