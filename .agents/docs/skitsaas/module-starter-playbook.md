---
title: "Module Starter Playbook"
sidebar_position: 0
---

# Module Starter Playbook

Use this page when the task is not just "what is a module mode?" but "I need to
start a new module with admin, dashboard, API, and future portability without
guessing the file layout."

## First Decision: `source-host` Or `source-package`

Use this decision rule:

- choose `source-package` if future portability matters and the SDK already
  covers the capabilities you need
- choose `source-host` only when the module truly needs host internals that are
  not yet exposed through the SDK

That makes `source-package` the preferred target and `source-host` the
pragmatic fallback.

## Boundary Summary

### `source-package`

- SDK-only for host capabilities
- compiled entry required
- portable by design
- own package pipeline
- should not import `@/app/*`, `@/lib/*`, or `@/components/*`

### `source-host`

- can use host internals when needed
- should still prefer SDK contracts first
- good for fast host-coupled delivery
- should be written with future migration in mind

## Canonical Examples

Use these examples first:

- `modules/mod.example.package`
  complete `source-package` example with pages, API, forms, tables, widgets,
  and template pack
- `modules/mod.example.api`
  typed `apiRoutes` example
- `modules/mod.example.portal`
  portal example

## Recommended File Layout

For a module with admin page, dashboard page, and API, the clean starter layout
is:

```txt
modules/mod.<name>/
  module.json
  package.json                  # source-package only
  src/
    constants.ts
    manifest.ts
    routes.ts                   # if using typed RouteApi or portals
    api-handler.ts              # if using legacy createModuleApiRouter
    pages/
      admin-pages.tsx
      dashboard-pages.tsx
    widgets.tsx                 # optional
  db/                           # optional migrations/schema
  i18n/                         # optional
  README.md
```

## The Minimum Pieces

### 1. `module.json`

This is where the host learns:

- `moduleMode`
- runtime entry
- build command for source-package
- SDK compatibility
- optional `routesEntry`
- optional `portalInit`
- optional template pack artifacts

### 2. `src/manifest.ts`

This is the runtime contract for the module:

- metadata
- admin/dashboard pages
- API surface
- nav items
- widgets
- event handlers
- template pack

### 3. Admin And Dashboard Pages

For multi-route admin or dashboard surfaces, the clean module-side pattern is:

- build a page router with `createModulePageRouter(...)`
- attach it as `adminPage` or `dashboardPage` in the manifest

The example package module shows this clearly:

- `examplePackageAdminPage`
- `examplePackageDashboardPage`

## API Choices

There are two supported API styles.

### Preferred For New Modules: typed `apiRoutes`

Use:

- `RouteApi(...).METHOD()` metadata in `src/routes.ts`
- attach handlers later in `src/manifest.ts` with `.handler(...)`

Why it is preferred:

- metadata stays edge-safe
- route names, auth, rate limits, and proxies are visible without eager handler imports
- aligns with the platform direction

The canonical example is:

- `modules/mod.example.api/src/routes.ts`
- `modules/mod.example.api/src/manifest.ts`

### Still Supported: `apiHandler`

Use:

- `createModuleApiRouter(...)`
- attach the resulting handler as `apiHandler` in the manifest

This is still valid for migration work and for existing modules such as:

- `modules/mod.example.package/src/api-handler.js`

## Suggested Default For A New Module

If the user did not explicitly require host-only internals:

1. choose `source-package`
2. use `createModulePageRouter(...)` for admin and dashboard page groups
3. use typed `apiRoutes`
4. keep forms and tables SDK-first
5. add a README that documents routes, config, and operational notes

## Build And Prepare Pipeline

Normal host-side flow:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

For targeted work:

```bash
pnpm modules:build -- --module=mod.<name>
```

## What To Put In The README

Every serious module should document:

- module mode
- routes and aliases
- API base
- config keys
- env keys
- build and test commands
- template pack behavior if present
- operational notes

## Common Mistakes

- picking `source-host` by default when the real goal is portability
- explaining module routes only in terms of aliases instead of dispatcher routes
- mixing typed API guidance and legacy `apiHandler` guidance without saying which
  one is preferred
- leaking host imports into a portable module
- forgetting that `module.json` and `manifest.ts` are different layers

## Related Docs

- `modules-and-sdk-boundaries.md`
- `routing-and-route-factories.md`
- `portal-and-module-api-examples.md`
