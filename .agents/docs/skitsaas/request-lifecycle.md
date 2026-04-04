---
title: "Request Lifecycle"
sidebar_position: 0
---

# Request Lifecycle

The most important concept in SkitSaaS is that not all requests go through the
same enforcement path.

## The Split That Matters

- page-like traffic:
  handled through `proxy.ts`
- `/api/*` traffic:
  handled by route-level or dispatcher-level API contracts

If an agent misses that split, it usually makes the wrong auth or routing
assumption.

## 1. Admin Or Dashboard Page Request

Flow:

1. request enters `proxy.ts`
2. `proxy.ts` imports `@/lib/routing/all-routes`
3. route metadata and area defaults are already registered
4. `matchRouteProxyChain(pathname)` resolves the chain
5. `executeProxyChain(...)` runs the chain
6. if allowed, Next continues to the App Router page

Key files:

- `proxy.ts`
- `lib/routing/all-routes.ts`
- `lib/routing/area-setup.ts`
- `lib/routing/proxies.ts`

## 2. Portal Request

Flow:

1. request enters `proxy.ts`
2. proxy chain is resolved and executed first
3. if path matches a registered portal prefix, the request is rewritten to
   `/portal-internal/*`
4. `app/(portal)/portal-internal/[...slug]/page.tsx` dispatches the portal page

Why this matters:

- portal pages do not inherit the normal frontend layout
- direct access to `/portal-internal/*` is blocked

## 3. Core API Request

Flow:

1. request hits `app/api/*`
2. `proxy.ts` does not run for `/api/*`
3. auth, rate limits, and extra proxies are enforced by the API route layer
4. typed routes can use `RouteApi(...).METHOD().auth().rateLimit().proxy()`

Key files:

- `app/sdk/src/routing/api-route.ts`
- `lib/routing/with-api-route.ts`
- `lib/routing/with-api-proxy.ts`
- `lib/routing/area-setup.ts`

## 4. Module Page Request

Flow:

1. request enters `proxy.ts`
2. page access is enforced there
3. dispatcher route resolves the module page
4. module runtime renders the module handler

Key dispatcher routes:

- `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx`
- `app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx`
- `app/(frontend)/modules/[moduleId]/[[...slug]]/page.tsx`

## 5. Module API Request

Flow:

1. request hits `/api/modules/[moduleId]/[[...slug]]`
2. `proxy.ts` does not run
3. module runtime resolves the API handler
4. module route metadata or legacy router contract enforces auth and rate limits

Key files:

- `app/api/modules/[moduleId]/[[...slug]]/route.ts`
- `lib/modules/runtime.ts`
- `app/sdk/src/modules/manifest.ts`

## 6. BuildForm Preflight Request

Flow:

1. browser posts to `/api/forms/validate`
2. same-origin and access checks run
3. local host registry resolves the form
4. DB-aware or server validation can run before final submit

Key files:

- `app/api/forms/validate/route.ts`
- `lib/forms/security.ts`
- `lib/forms/registry.ts`
- `lib/forms/preflight.ts`

## 7. Module SDK Service Access

Module code does not directly own every host service. It depends on host
adapters configured during bootstrap.

Key bridge:

- `lib/modules/sdk-server-bootstrap.ts`

That bootstrap wires module SDK access to:

- auth
- database and table lookup
- config
- notifications
- revalidation
- event emitters
- feature and quota services
- i18n

## Quick Trust Model

| Surface | Main control |
|---|---|
| admin/dashboard/frontend pages | `proxy.ts` plus area defaults or named route chain |
| portals | `proxy.ts` plus internal rewrite |
| core APIs | typed API metadata and API wrappers |
| module pages | `proxy.ts` plus runtime dispatcher |
| module APIs | module API contract plus runtime dispatcher |
| form preflight | same-origin plus form access and validation checks |
