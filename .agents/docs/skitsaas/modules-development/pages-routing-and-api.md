---
title: "Module Pages, Routing, And API"
sidebar_position: 0
---

# Module Pages, Routing, And API

This page explains how module pages and module APIs are expected to hang
together in SkitSaaS.

## Canonical Dispatcher Surfaces

Every module should be explained relative to these runtime routes:

| Surface | Canonical route |
|---|---|
| admin module page | `/admin/modules/[moduleId]/[[...slug]]` |
| dashboard module page | `/dashboard/modules/[moduleId]/[[...slug]]` |
| frontend module page | `/modules/[moduleId]/[[...slug]]` |
| module API | `/api/modules/[moduleId]/[[...slug]]` |

Friendly aliases can point to those surfaces, but the dispatcher routes remain
the stable base.

## Admin And Dashboard Pages

For multiple page paths inside a module, the clean pattern is:

- define a module page router
- attach it as `adminPage` or `dashboardPage` in the manifest

The canonical example is:

- `modules/mod.example.package/src/manifest.js`

That module uses `createModulePageRouter(...)` to define:

- admin routes like `/`, `/create`, `/settings`, `/edit/:itemId`
- dashboard routes like `/`, `/create`, `/items/:itemId`

## Aliases

Modules can declare:

- `adminRouteAliases`
- `dashboardRouteAliases`
- `frontendRouteAliases`

Use aliases for nicer URLs. Do not describe them as if they replace the
dispatcher contract.

## Typed API Routes: Preferred Pattern

Preferred new-module path:

- route metadata in `src/routes.ts`
- handler attachment in `src/manifest.ts`

Use:

- `RouteApi(...).METHOD()` for metadata
- `.handler(...)` in `apiRoutes` for the runtime handler

Canonical example:

- `modules/mod.example.api/src/routes.ts`
- `modules/mod.example.api/src/manifest.ts`

Benefits:

- metadata stays lightweight and edge-safe
- auth, rate limits, and route naming stay visible without importing handler code

## Legacy API Router: Still Supported

Existing modules may still use:

- `createModuleApiRouter(...)`
- `apiHandler` in the manifest

Canonical example:

- `modules/mod.example.package/src/api-handler.js`
- `modules/mod.example.package/src/manifest.js`

This is still valid, but it is not the preferred new-module authoring pattern.

## API Access Rules

Module API auth is not inherited from `proxy.ts`.

That means:

- page traffic uses page-side proxy enforcement
- module API traffic goes through the module API dispatcher
- auth/rate-limit/roles must be part of the module API contract

Use:

- typed route `.auth(...)`
- typed route `.roles(...)`
- typed route `.rateLimit(...)`
- typed route `.proxy([...])`

Or in legacy router style:

- `auth`
- `roles`
- `canAccess`

## Portals

If the module owns a portal, add:

- `routesEntry` in `module.json`
- `portalInit` in `module.json`

Use the portal split:

- `src/routes.ts` for portal metadata
- `src/portal-init.ts` for page registration and layout config

Canonical example:

- `modules/mod.example.portal`

## Suggested Routing Checklist

For a new module with admin, dashboard, and API:

1. define module mode
2. add `module.json`
3. wire `src/manifest.ts`
4. define admin/dashboard page routers
5. choose typed `apiRoutes` or legacy `apiHandler`
6. add aliases only after the dispatcher routes are clear

## Common Mistakes

- documenting a module only in terms of aliases
- using the legacy API router example as if it were the default for new modules
- forgetting that module API traffic bypasses `proxy.ts`
