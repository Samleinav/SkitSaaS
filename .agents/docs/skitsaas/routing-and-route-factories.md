---
title: "Routing And Route Factories"
sidebar_position: 0
---

# Routing And Route Factories

SkitSaaS routing is factory-driven. The route helper is part of the platform
contract, not just a convenience wrapper.

## Core Rule

`lib/routing/area-setup.ts` must run before route factories are used so the
area defaults and API auth proxies are already configured.

That setup file is where the host injects:

- `admin` default proxies
- `dashboard` default proxies
- area base URLs
- typed API auth proxies
- route-builder role proxies

## Route Factories

| Factory | Purpose |
|---|---|
| `RouteAdmin(path)` | admin pages under the admin base |
| `RouteDashboard(path)` | dashboard pages under the dashboard base |
| `RouteFrontend(path)` | frontend pages |
| `RouteApi(path)` | typed API route metadata under the API base |
| `RoutePortal(name)` | portal page metadata |
| `RouteApiPortal(name)` | portal-scoped API route metadata |

Key source files:

- `app/sdk/src/routing/area.ts`
- `app/sdk/src/routing/builder.ts`
- `app/sdk/src/routing/api-route.ts`
- `app/sdk/src/routing/portal.ts`

## Important `RouteApi` Detail

Pass paths relative to the API base.

Example:

```ts
RouteApi('/modules/mod.example.package/items').GET().auth('user')
```

With the default base, that becomes:

```txt
/api/modules/mod.example.package/items
```

Do not manually prepend `/api` in the route factory call.

## Named Route Mental Model

Factories are used to define route metadata:

- path
- optional params
- optional auth and roles
- optional rate limits
- optional extra proxy chain
- optional route name

This is the closest SkitSaaS equivalent to Laravel-style route builders and
named route helpers.

## Canonical Dispatchers

These are the main runtime dispatch surfaces:

| Surface | Canonical route |
|---|---|
| admin module pages | `/admin/modules/[moduleId]/[[...slug]]` |
| dashboard module pages | `/dashboard/modules/[moduleId]/[[...slug]]` |
| frontend module pages | `/modules/[moduleId]/[[...slug]]` |
| module APIs | `/api/modules/[moduleId]/[[...slug]]` |

Friendly aliases may exist, but the dispatcher routes remain the stable base.

## Aliases

Modules can expose friendly aliases through manifest metadata:

- `adminRouteAliases`
- `dashboardRouteAliases`
- `frontendRouteAliases`

Rules:

- alias must stay in its area
- alias cannot collide with core routes
- alias cannot overlap another module alias in an invalid way
- longest alias wins when overlap is allowed inside the same module

## Area Defaults

Current host defaults:

- admin -> `proxyAdmin`
- dashboard -> `proxyAuth`
- frontend -> none by default

That means even unregistered `/admin/*` and `/dashboard/*` paths still inherit
their area guard behavior.

## Portals

Portals are not just aliases. They are independent named areas served through
an internal rewrite path and their own layout/runtime path.

Read [Portals and Aliases](./portals-and-aliases.md) when the request is about
`/<portalName>/*` routes.

## Common Mistakes

- forgetting that route factories capture defaults at registration time
- assuming `RouteApi` path should include `/api`
- treating aliases as the primary route surface instead of the dispatcher
- forgetting that portal routing is its own system, not just frontend aliasing
