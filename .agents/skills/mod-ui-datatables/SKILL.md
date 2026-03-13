---
name: mod-ui-datatables
description: Build list views and CRUD data tables inside a source-package module using the SDK datatable system. Use this skill when adding paginated lists, sortable tables, bulk actions, or CRUD routing for module-owned data.
---

# mod-ui-datatables

## Scope

`defineBuildTable`, CRUD router via `@skitsaas/sdk/datatables/server`, query state, and the `DataTable` portable renderer inside module code.

## Required References

- `docs/datatables/01-build-table-system.md` — `defineBuildTable`, columns, filters, actions, view resolution
- `docs/datatables/02-sdk-datatables-crud.md` — CRUD router, `@skitsaas/sdk/datatables/server` entry point

## Boundary Rules (CRITICAL)

```
FORBIDDEN in client components:
  @/lib/datatables/*
  @skitsaas/sdk/datatables/server   ← SERVER-ONLY, never in client bundle

REQUIRED (client / shared):
  defineBuildTable, buildTableColumn, buildTableFilter, buildTableAction,
  parseBuildTableQueryState, resolveBuildTableView, DataTable
    → @skitsaas/sdk  OR  @skitsaas/sdk/datatables

REQUIRED (server API handler only):
  CRUD router helpers → @skitsaas/sdk/datatables/server
```

`@skitsaas/sdk/datatables/server` imports Vine and Node builtins — placing it in a client component will break the bundle. Always keep it in server-only files (API route handlers, server actions).

If a table needs a join on a host table not in `TABLE_REGISTRY`:
→ use `getTable()` from `@skitsaas/sdk/server` (never import host schema directly).

## Table Definition

```ts
// modules/mod.<id>/src/tables.ts
import { defineBuildTable, buildTableColumn, buildTableFilter, buildTableAction } from '@skitsaas/sdk';

export const itemsTable = defineBuildTable({
  id: 'mod.<id>.items',
  columns: [
    buildTableColumn.text({ key: 'name', label: 'Name', sortable: true }),
    buildTableColumn.badge({ key: 'status', label: 'Status' }),
  ],
  filters: [
    buildTableFilter.search({ key: 'name', placeholder: 'Search...' }),
  ],
  actions: {
    row: [
      buildTableAction.link({ label: 'Edit', href: (row) => `/admin/modules/mod.<id>/${row.id}/edit` }),
    ]
  }
});
```

## CRUD Router (Server API Handler)

```ts
// modules/mod.<id>/src/api/items.ts  (server-only file)
import { createCrudRouter } from '@skitsaas/sdk/datatables/server';
import { getAdminDb } from '@skitsaas/sdk/server';

export const itemsCrudRouter = createCrudRouter({
  table: 'mod_<id>_items',
  getDb: () => getAdminDb<any>(),
});
```

Wire the CRUD endpoints into `apiRoutes` in `src/manifest.ts`.
Use `apiHandler` via `createModuleApiRouter` only for legacy migrations.

## Rendering the Table

```tsx
// modules/mod.<id>/src/pages/admin-items-page.tsx
'use client'
import { DataTable, parseBuildTableQueryState } from '@skitsaas/sdk';
import { itemsTable } from '../tables';

export default function ItemsPage({ searchParams }) {
  const queryState = parseBuildTableQueryState(searchParams);
  return <DataTable definition={itemsTable} queryState={queryState} />;
}
```

## Query State in API Handler

```ts
import { resolveBuildTableView } from '@skitsaas/sdk';

const view = resolveBuildTableView(itemsTable, queryState);
// use view.filters, view.sort, view.page to build DB query
```

## Verification

```bash
# Must return 0 matches — datatables/server in client components
rg -n "datatables/server" modules/<moduleId>/src/pages
rg -n "datatables/server" modules/<moduleId>/src/components
rg -n "@/lib/datatables" modules/<moduleId>
pnpm exec tsc --noEmit
```
