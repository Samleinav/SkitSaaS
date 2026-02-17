---
title: SDK Datatables CRUD
sidebar_position: 17
---

# SDK Datatables CRUD

`@skitsaas/sdk` now exposes a datatable helper focused on module CRUD endpoints and theme contract IDs.

## Exports

- `createDataTableCrudApiRouter`
- `createDataTableTemplateContract`
- `createDataTableTemplateEntries`

Available from:

- `@skitsaas/sdk`
- `@skitsaas/sdk/datatables`

## CRUD API router helper

Use `createDataTableCrudApiRouter` to build list/create/update/delete endpoints with:

- route-level auth/roles policies (reusing module API router policies)
- JSON body parsing + validation hooks
- ID parsing hook (`parseId`)
- operation-level revalidation paths
- standard JSON response shape (`{ ok, operation, data }`)

Example:

```ts
import { createDataTableCrudApiRouter } from '@skitsaas/sdk/datatables';

export const api = createDataTableCrudApiRouter({
  basePath: '/records',
  policies: {
    list: { auth: 'admin' },
    create: { auth: 'admin' },
    update: { auth: 'admin' },
    delete: { auth: 'admin' }
  },
  parseId: (raw) => {
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  },
  handlers: {
    list: async () => ({ items: [] }),
    create: async ({ input }) => input,
    update: async ({ id, input }) => ({ id, ...input }),
    delete: async ({ id }) => ({ id })
  }
});
```

## Theme component ID contract helper

Use `createDataTableTemplateContract` to generate stable module-scoped IDs:

```ts
import { createDataTableTemplateContract } from '@skitsaas/sdk/datatables';

const contract = createDataTableTemplateContract({
  moduleId: 'mod.example.apikeys',
  resource: 'api-keys'
});
```

Generated slots:

- `table`
- `toolbar`
- `row-actions`
- `create-form`
- `edit-form`
- `delete-action`

Then convert to manifest entries with `createDataTableTemplateEntries` and inject them in `ModuleManifest.templatePack`.

## Host UI integration notes

In host app routes, pass `componentId` + `themeId` + `area` to the client
datatable component (`components/ui/data-table.tsx`). The datatable resolves a
code template (`ui.table`) from the active theme registry and falls back to the
core UI when the template does not exist.

`theme.first.backoffice` applies this with a code template in:

- `themes/first-backoffice/templates/ui.table.tsx`

The same `ui.table` template is used for `admin` and `dashboard`, branching by
`data.area` when needed.
