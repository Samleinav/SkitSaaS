---
title: "Source-Package Worked Example"
sidebar_position: 0
---

# Source-Package Worked Example

Use this page when the question is not just "what is a module?" but "show me
the exact starter shape I can copy for a real `source-package` module."

This page intentionally overlaps with the main module docs. The goal is to keep
one Botble-style path that is detailed enough for humans and agents to stay in
docs instead of jumping into source too early.

## Recommended Starter Tree

Use this as the default starting point for a new portable module:

```txt
modules/mod.billing-reports/
  README.md
  module.json
  package.json
  scripts/
    build.mjs
  src/
    constants.ts
    routes.ts
    manifest.ts
    forms.ts
    tables.ts
    actions.ts
    data.ts
    pages/
      admin-pages.tsx
      dashboard-pages.tsx
    widgets.tsx
    templates/
      defaults.json
      overrides.json
  db/
    migrations/
      0001_init.sql
    schema.ts
  i18n/
    translations/
      en.json
  tests/
    module-contract.test.mjs
  dist/
```

This is the cleanest "full feature" shape because it leaves obvious homes for:

- admin and dashboard pages
- typed API metadata
- form and table definitions
- module-local persistence
- CTC template pack entries
- testable compiled output

## What Each File Owns

### `README.md`

The module-owned operating manual. It should explain:

- module mode
- route surfaces and aliases
- API base
- config and env keys
- build and test commands
- migrations and operational notes

### `module.json`

Host pipeline metadata. It should answer:

- what mode the module uses
- where runtime entry lives
- how the host builds it
- which SDK range it supports
- whether it contributes routes, portals, DB migrations, or template packs

### `src/routes.ts`

Edge-safe metadata only. Put here:

- `RouteApi(...).METHOD()`
- auth and rate-limit metadata
- route names
- portal route metadata if the module owns a portal

Do not put handler-heavy React or DB imports here.

### `src/manifest.ts`

Runtime contract. Put here:

- `defineModule(...)`
- `adminPage`
- `dashboardPage`
- `apiRoutes` handlers
- nav items
- widgets
- template pack metadata

### `src/forms.ts` and `src/tables.ts`

Keep form and table contracts in stable files so pages stay thin and the module
can reuse the same builder definitions across admin, dashboard, or portal
surfaces.

### `src/pages/*`

Keep page renderers here. They should compose:

- SDK forms
- SDK tables
- local server actions
- module-local loaders

### `db/*`

Module-owned persistence only. Do not move these tables into host schema files.

## Exact `module.json` Shape

This is the safest default for a new `source-package` module:

```json
{
  "moduleId": "mod.billing-reports",
  "moduleMode": "source-package",
  "version": "0.1.0",
  "entry": "dist/manifest.js",
  "sourceEntry": "src/manifest.ts",
  "buildCommand": "pnpm build",
  "testCommand": "pnpm test:module",
  "sdkRange": "^1.7.1",
  "routesEntry": "src/routes.ts",
  "templatePack": {
    "defaultEntry": "dist/templates/defaults.json",
    "overrideEntry": "dist/templates/overrides.json",
    "contractRange": "^1.0.0"
  },
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Use `routesEntry` when the module exposes typed API metadata or portals. Omit
it only when the module truly does not own those surfaces.

### When `templatePack` Is Optional

Do not add `templatePack` just because the field exists.

Omit it when the module:

- only needs standard SDK form and table rendering
- does not ship its own CTC defaults or overrides
- is meant to stay operationally simple

Add it when the module truly needs to change template resolution for component
IDs such as `ui.table`, `ui.form`, or `ui.async-submit-button`.

## `manifest.ts` Versus `routes.ts`

This distinction is where new authors usually drift.

Use this rule:

- `routes.ts` describes the API path contract
- `manifest.ts` attaches the real behavior

### `src/routes.ts`

```ts
import { RouteApi } from '@skitsaas/sdk';

const BASE = '/modules/mod.billing-reports';

export const BillingReportRoutes = {
  index: RouteApi(`${BASE}/reports`).GET().auth('admin').name('mod.billing-reports.index'),
  create: RouteApi(`${BASE}/reports`).POST().auth('admin').name('mod.billing-reports.create'),
  show: RouteApi(`${BASE}/reports/{id}`).GET().auth('user').name('mod.billing-reports.show')
} as const;
```

### `src/manifest.ts`

```ts
import { defineModule } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import { BillingReportRoutes } from './routes';
import { billingReportForm } from './forms';
import { billingReportTable } from './tables';

const adminPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => renderAdminHomePage({ table: billingReportTable }) },
    { path: '/create', handler: () => renderAdminCreatePage({ form: billingReportForm }) }
  ]
});

export default defineModule({
  moduleId: 'mod.billing-reports',
  version: '0.1.0',
  adminPage,
  apiRoutes: [
    BillingReportRoutes.index.handler(() => Response.json({ data: [] })),
    BillingReportRoutes.create.handler(async () => Response.json({ created: true }, { status: 201 })),
    BillingReportRoutes.show.handler((_request, params) => Response.json({ id: params.id }))
  ]
});
```

That separation keeps route metadata lightweight and keeps runtime wiring in the
manifest layer where SkitSaaS expects it.

## Copyable `forms.ts` And `tables.ts` Sketch

Use a small stable contract file for each UI surface instead of defining the
whole UI inline inside page files.

### `src/forms.ts`

```ts
import { buildFormField, defineBuildForm } from '@skitsaas/sdk';

export const billingReportForm = defineBuildForm({
  id: 'mod.billing-reports.form.report',
  fields: [
    buildFormField.text({
      name: 'name',
      label: 'Report name',
      required: true
    }),
    buildFormField.select({
      name: 'range',
      label: 'Date range',
      options: [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' }
      ]
    })
  ]
});
```

### `src/tables.ts`

```ts
import { buildTableColumn, defineBuildTable } from '@skitsaas/sdk';

export const billingReportTable = defineBuildTable({
  id: 'mod.billing-reports.table.report',
  columns: [
    buildTableColumn.text({
      id: 'name',
      header: 'Name',
      accessorKey: 'name'
    }),
    buildTableColumn.text({
      id: 'range',
      header: 'Range',
      accessorKey: 'range'
    })
  ]
});
```

That is enough to communicate the expected file shape. The richer validation,
actions, and render customization can grow from there.

## Copyable `actions.ts` Sketch

Portable modules should still use SDK server helpers instead of host-only
controllers.

```ts
'use server';

import {
  createValidatedServerActionController,
  requireAdmin,
  revalidatePaths
} from '@skitsaas/sdk/server';
import { createBillingReportFormDefinition } from './forms';
import { createBillingReport } from './data';

const adminValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireAdmin()
});

export const createBillingReportAdminAction = adminValidatedAction(
  createBillingReportFormDefinition(),
  async ({ values }) => {
    await createBillingReport({
      name: typeof values.name === 'string' ? values.name : '',
      range: typeof values.range === 'string' ? values.range : '30d'
    });

    await revalidatePaths([
      '/admin/custom/billing-reports',
      '/admin/custom/billing-reports/create'
    ]);
  }
);
```

This is the smallest useful example of the SDK-first mutation path that still
feels like real module code.

## Remote Table Loader With Typed API

For a module list page, the clean relationship is:

1. `src/routes.ts` declares a typed `GET /reports` route
2. `src/manifest.ts` attaches the handler in `apiRoutes`
3. the admin or dashboard page points the table loader at that endpoint

Use this mental model:

- page route owns the HTML shell
- typed module API owns JSON table data
- BuildTable owns table semantics

That split keeps admin/dashboard pages simpler and keeps the JSON contract
explicit.

## Module Config Read And Write Sketch

Use the module config helpers exposed through the SDK-facing server surface
instead of inventing your own storage layer.

```ts
import { getModuleConfigValue, setModuleConfigValue } from '@skitsaas/sdk/server';

const exportFormat = await getModuleConfigValue('mod.billing-reports', 'defaultExportFormat');

await setModuleConfigValue('mod.billing-reports', 'defaultExportFormat', 'csv');
```

Keep those keys documented in the module README so runtime behavior and
operational tuning stay visible outside the source files.

## Worked Example: One Module, Many Surfaces

The recommended first serious module should cover these four flows:

1. admin page with remote `DataTable`
2. admin create page with `TemplateBuildForm`
3. dashboard page with a user-safe list or detail view
4. typed module API for JSON consumers and table loaders

Use this responsibility split:

- `src/forms.ts`
  exports `defineBuildForm(...)` contracts
- `src/tables.ts`
  exports `defineBuildTable(...)` contracts
- `src/actions.ts`
  exports SDK-safe validated server actions
- `src/data.ts`
  exports DB reads and writes
- `src/pages/admin-pages.tsx`
  composes table + create/edit pages
- `src/pages/dashboard-pages.tsx`
  composes user-safe views

That keeps the module understandable even after it grows.

If the module also needs a dashboard detail page, keep it in
`src/pages/dashboard-pages.tsx` and treat it as a consumer of the same module
data layer and typed API contract rather than inventing a second parallel
runtime path.

## Annotated README Template

This is the minimum README shape worth copying:

~~~~md
# mod.billing-reports

Portable `source-package` module for billing analytics and report export.

## Module metadata

- `moduleId`: `mod.billing-reports`
- `moduleMode`: `source-package`
- runtime entry: `dist/manifest.js`
- SDK range: `^1.7.1`

## Routes and aliases

- canonical admin page: `/admin/modules/mod.billing-reports`
- canonical dashboard page: `/dashboard/modules/mod.billing-reports`
- API base: `/api/modules/mod.billing-reports/*`
- admin alias: `/admin/custom/billing-reports`

## Features

- admin report table
- report create form
- dashboard report viewer
- export API

## Build and test

```bash
pnpm build
pnpm test:module
```

## Host pipeline

```bash
pnpm modules:build -- --module=mod.billing-reports
pnpm modules:prepare
pnpm modules:migrate --module=mod.billing-reports
```

## Data ownership

- tables live in `db/*`
- migrations live in `db/migrations/*`

## Notes

- SDK-only imports for host capabilities
- template pack overrides `ui.table`
~~~~

If a module README does not cover those basics, agents will usually have to
open files to reconstruct the runtime.

## Real Repo Examples To Cross-Check

When you want to compare this starter against the current repo:

- `modules/mod.example.package`
  best full `source-package` example
- `modules/mod.example.api`
  clean typed `apiRoutes` example
- `modules/mod.example.portal`
  portal-specific split between `routes.ts` and `portal-init.ts`

## Build Checklist

Before calling the module ready, verify:

1. `module.json` matches the real emitted files
2. `manifest.ts` owns the runtime wiring
3. `routes.ts` contains metadata, not heavy runtime imports
4. forms and tables stay SDK-first
5. README explains canonical routes before aliases
6. module DB assets stay inside the module

## Related Docs

- `./getting-started.md`
- `./pages-routing-and-api.md`
- `./ui-forms-and-tables.md`
- `./data-config-and-i18n.md`
- `./testing-and-release.md`
- `../module-starter-playbook.md`
