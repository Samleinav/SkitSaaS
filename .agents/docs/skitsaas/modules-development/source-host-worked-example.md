---
title: "Source-Host Worked Example"
sidebar_position: 0
---

# Source-Host Worked Example

Use this page when the question is not "what is `source-host`?" but "show me
the exact shape of a real host-coupled module that still uses SDK contracts
first."

This is the natural companion to the portable
[`source-package` worked example](./source-package-worked-example.md). The goal
here is different: move fast inside the host runtime without losing the path to
future SDK portability.

## When `source-host` Is The Right Choice

Choose `source-host` when:

- the module needs host internals that are not yet exposed through the SDK
- you want one module to move quickly inside the current repo
- the module is tightly coupled to this host deployment
- portability is still desirable later, but not the first constraint today

Do not choose it by habit. It is the pragmatic path, not the ideal end state.

## Canonical Example In This Repo

Use `modules/mod.example.suite` as the main reference.

That module demonstrates, in one place:

- admin page router
- dashboard page router
- route aliases built with SDK route factories
- validated server actions
- module-owned DB tables
- SDK forms and SDK tables
- widgets
- legacy `apiHandler`
- governance evidence reads through SDK server helpers

## Recommended Starter Tree

Use this as the clean default for a serious `source-host` module:

```txt
modules/mod.analytics-suite/
  README.md
  module.json
  db/
    schema.ts
    migrations/
      0001_init.sql
  i18n/
    translations/
      en.json
  src/
    constants.ts
    routes.ts
    manifest.ts
    forms.ts
    actions.ts
    data.ts
    api-handler.ts
    widgets.tsx
    pages/
      admin-pages.tsx
      dashboard-pages.tsx
      admin/
        home.tsx
        create.tsx
        edit.tsx
        settings.tsx
    templates/
      defaults.json
      overrides.json
```

This shape works well because it keeps the host-coupled edges visible instead
of hiding them inside page files.

## Exact `module.json` Shape

Safe default:

```json
{
  "moduleId": "mod.analytics-suite",
  "moduleMode": "source-host",
  "version": "0.1.0",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.9.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Important difference from `source-package`:

- `source-host` uses `sourceEntry`
- no compiled `entry` is required for the host to consume it
- own package/build pipeline is optional, not mandatory

## What Each Core File Owns

### `src/routes.ts`

Use it for:

- `RouteAdmin(...)`
- `RouteDashboard(...)`
- route naming
- stable alias path definitions

This keeps URL construction and alias naming out of random page files.

### `src/manifest.ts`

Use it for:

- `defineModule(...)`
- admin and dashboard page routers
- nav items
- widgets
- template pack metadata
- `apiHandler` or `apiRoutes`

### `src/actions.ts`

Use this file for validated module actions.

For `source-host` modules, the recommended path is still SDK-first:

- `createServerActionController(...)`
- `createValidatedServerActionController(...)`
- `requireAdmin(...)`
- `requireUser(...)`
- `revalidatePaths(...)`

The example suite shows this exact pattern.

### `src/data.ts`

Keep module DB reads and writes here, even when the module is host-coupled.

That makes future migration easier because the persistence boundary remains
visible.

### `db/*`

Module-owned tables stay inside the module even in `source-host` mode.

Do not move them into host schema files just because host imports are allowed.

## Copyable `routes.ts` Shape

This is the clean starter pattern for aliases and route names:

```ts
import { RouteAdmin, RouteDashboard } from '@skitsaas/sdk';

const ADMIN_BASE = '/custom/analytics-suite';
const DASHBOARD_BASE = '/custom/analytics-suite';

export const AnalyticsSuiteRoutes = {
  admin: {
    home: RouteAdmin(`${ADMIN_BASE}`).name('analytics-suite.admin.home'),
    create: RouteAdmin(`${ADMIN_BASE}/create`).name('analytics-suite.admin.create'),
    edit: RouteAdmin(`${ADMIN_BASE}/edit/{id}`).name('analytics-suite.admin.edit'),
    settings: RouteAdmin(`${ADMIN_BASE}/settings`).name('analytics-suite.admin.settings')
  },
  dashboard: {
    home: RouteDashboard(`${DASHBOARD_BASE}`).name('analytics-suite.dashboard.home'),
    create: RouteDashboard(`${DASHBOARD_BASE}/create`).name('analytics-suite.dashboard.create'),
    item: RouteDashboard(`${DASHBOARD_BASE}/items/{id}`).name('analytics-suite.dashboard.item')
  },
  apiBase: '/api/modules/mod.analytics-suite'
} as const;
```

## Copyable `manifest.ts` Shape

This is the right mental model for a host-coupled module that still reads
cleanly:

```ts
import { defineModule } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import { AnalyticsSuiteRoutes } from './routes';

const adminPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => renderAdminHomePage() },
    { path: '/create', handler: () => renderAdminCreatePage() },
    { path: '/settings', handler: () => renderAdminSettingsPage() },
    { path: '/edit/:itemId', handler: ({ params }) => renderAdminEditPage(params.itemId) }
  ]
});

const dashboardPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => renderDashboardHomePage() },
    { path: '/create', handler: () => renderDashboardCreatePage() },
    { path: '/items/:itemId', handler: ({ params }) => renderDashboardItemPage(params.itemId) }
  ]
});

export default defineModule({
  moduleId: 'mod.analytics-suite',
  version: '0.1.0',
  adminRouteAliases: [String(AnalyticsSuiteRoutes.admin.home)],
  dashboardRouteAliases: [String(AnalyticsSuiteRoutes.dashboard.home)],
  adminPage,
  dashboardPage,
  apiHandler: analyticsSuiteApiHandler
});
```

## Copyable `actions.ts` Shape

The `source-host` story should still prefer SDK server helpers over ad-hoc host
action plumbing:

```ts
'use server';

import {
  createValidatedServerActionController,
  requireAdmin,
  requireUser,
  revalidatePaths
} from '@skitsaas/sdk/server';

const adminValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireAdmin()
});

const dashboardValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireUser()
});
```

That keeps action logic migration-friendly even when the module is still
`source-host`.

## Where Host Imports Are Still Acceptable

`source-host` does allow host imports when necessary, but use this decision
order:

1. if the SDK already exposes it, use the SDK
2. if not, use a host import only for the missing capability
3. isolate that host dependency so future migration is easier

Good examples of what should usually stay SDK-first:

- forms
- datatables
- route factories
- revalidation helpers
- event emitters
- config and DB adapters
- i18n translators

## Host-Coupled, But Not Chaotic

A good `source-host` module still should:

- keep routes centralized
- keep pages thin
- keep DB logic inside the module
- keep host-only imports visible and justified
- keep README ownership clear

## Annotated README Template

~~~~md
# mod.analytics-suite

Host-coupled module for internal analytics workflows in this SkitSaaS runtime.

## Module metadata

- `moduleId`: `mod.analytics-suite`
- `moduleMode`: `source-host`
- source entry: `src/manifest.ts`
- SDK range: `^1.9.0`

## Routes and aliases

- canonical admin page: `/admin/modules/mod.analytics-suite`
- canonical dashboard page: `/dashboard/modules/mod.analytics-suite`
- API base: `/api/modules/mod.analytics-suite/*`
- admin alias: `/admin/custom/analytics-suite`
- dashboard alias: `/dashboard/custom/analytics-suite`

## Features

- admin CRUD flow
- dashboard-owned create/detail flow
- module widgets
- module-owned DB tables
- module API endpoints

## Validation

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

## Runtime notes

- keeps SDK-first forms and tables
- uses host coupling only where SDK gaps still exist
- module-owned schema stays under `db/*`
~~~~

## Difference From `source-package`

The practical difference is:

- `source-package`
  optimizes for portability and compiled distribution
- `source-host`
  optimizes for speed inside this host while still preferring SDK-first code

So the goal is not "never use host imports". The goal is "use host imports only
where they are still genuinely needed."

## Good Review Checklist

Before calling a `source-host` module healthy, verify:

1. `moduleMode` is explicit
2. routes live in `routes.ts`, not sprinkled across pages
3. forms and tables stay SDK-first
4. actions use SDK server controllers
5. module tables stay inside the module
6. host-only imports are justified and minimal
7. README explains what is host-coupled

## Real Repo Cross-Checks

- `modules/mod.example.suite`
  best full `source-host` example
- `modules/mod.example.package`
  best full `source-package` example
- `modules/mod.example.api`
  best typed `apiRoutes` example

## Related Docs

- `./getting-started.md`
- `./pages-routing-and-api.md`
- `./ui-forms-and-tables.md`
- `./data-config-and-i18n.md`
- `./testing-and-release.md`
- `./source-package-worked-example.md`
- `../modules-and-sdk-boundaries.md`
