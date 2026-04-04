---
title: "Module Development Getting Started"
sidebar_position: 0
---

# Module Development Getting Started

This page is the shortest path from "I need a module" to a correct starting
shape in SkitSaaS.

## First Decision: Module Mode

Choose the mode before designing imports or file layout.

### Choose `source-package` when:

- future portability matters
- the SDK already covers the required platform features
- the module should own its own package/build pipeline

### Choose `source-host` when:

- the module really needs host internals that are not yet exposed by the SDK
- you need to move fast with local host coupling
- you accept that the module will carry more migration debt

## Boundary Rules

### `source-package`

- use SDK entrypoints for host/platform capabilities
- do not import `@/app/*`
- do not import `@/lib/*`
- do not import `@/components/*`
- compile an entry consumed by the host

### `source-host`

- host imports are allowed when necessary
- SDK-first still applies
- direct host imports should be treated as convenience debt, not the goal

## Minimum Structure

Typical module structure:

```txt
modules/mod.<name>/
  README.md
  module.json
  src/
    constants.ts
    manifest.ts
    routes.ts
    api-handler.ts
    pages/
      admin-pages.tsx
      dashboard-pages.tsx
    widgets.tsx
  db/
    migrations/
    schema.ts
  i18n/
```

Not every module needs every folder, but every serious module should have:

- `README.md`
- `module.json`
- `src/manifest.ts`

## What Each Core File Means

### `README.md`

This is the module-owned source of truth for:

- routes and aliases
- env keys
- config values
- build and test commands
- operational notes

### `module.json`

This is metadata for the host pipeline, including:

- `moduleMode`
- source or compiled entry
- build command for source-package
- `sdkRange`
- optional `routesEntry`
- optional `portalInit`
- optional `db` migration metadata

### `src/manifest.ts`

This is the runtime contract for the module:

- pages
- APIs
- nav items
- widgets
- event handlers
- template pack

## Canonical Starting Points

Use these real examples:

- `modules/mod.example.package/README.md`
- `modules/mod.example.package/src/manifest.js`
- `modules/mod.example.api/src/manifest.ts`

## Default Recommendation

If the user did not explicitly ask for a host-coupled module, the safest modern
default is:

1. choose `source-package`
2. keep platform access SDK-only
3. use typed `apiRoutes`
4. use SDK BuildForm and BuildTable contracts

## Common Mistakes

- starting implementation before choosing the module mode
- assuming aliases are the runtime base instead of the dispatcher routes
- treating `source-host` as the default even when portability is the goal
