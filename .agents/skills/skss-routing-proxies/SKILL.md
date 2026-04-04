---
name: skss-routing-proxies
description: Use for route helpers, aliases, portals, auth redirects, proxy chains, typed API routes, and page-vs-API enforcement questions in SkitSaaS.
---

# skss-routing-proxies

## Read Order

1. `../../docs/skitsaas/request-lifecycle.md`
2. `../../docs/skitsaas/routing-and-route-factories.md`
3. `../../docs/skitsaas/context-area/index.md` when the task touches frontend module routes or slot embedding
4. `../../docs/skitsaas/proxies-and-api-security.md`
5. `../../docs/skitsaas/security/index.md` when the task touches auth-extension or tenant-security boundaries
6. `../../docs/skitsaas/portals-and-aliases.md` when portals or aliases are involved
7. `../../docs/skitsaas/portal-and-module-api-examples.md` when the user wants a concrete flow instead of just architecture

## Verify In Code Only If Needed

- `lib/routing/area-setup.ts`
- `proxy.ts`
- `lib/routing/proxies.ts`
- `app/sdk/src/routing/area.ts`
- `app/sdk/src/routing/api-route.ts`
- `app/sdk/src/routing/portal.ts`
- `lib/modules/runtime.ts`

## Rules

- `RouteApi(...)` paths are relative to the API base
- page traffic and API traffic are different enforcement pipelines
- portals are their own runtime, not just frontend aliases
- alias routes are convenience paths; dispatcher routes remain canonical
- use `mod.example.api` as the preferred typed API example and `mod.example.package`
  only when discussing the legacy router path explicitly

## Watch For

- missing area defaults at route registration time
- auth assumptions copied from page routes into API handlers
- direct use of `/portal-internal/*`
