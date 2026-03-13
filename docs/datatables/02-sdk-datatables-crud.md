---
title: SDK BuildTable
description: How module authors define SDK-backed datatables with remote search, filters, pagination, and actions.
sidebar_position: 17
---

# SDK BuildTable

Use `BuildTable` when a module needs a datatable whose contract is defined from `@skitsaas/sdk`.

In this repository, the recommended path is:

- define the table contract in the SDK
- render with SDK `DataTable` by default; current table features are covered there
- in `source-host` modules, switch to the host adapter only when you specifically want host theme/CTC wrappers

The SDK contract gives you:

- one shared table contract for `source-host` and `source-package`
- default rendering for headers, toolbar, search, filters, sorting, pagination, and empty states
- declarative row actions and header actions
- built-in request actions with optional confirm dialogs
- remote list loading through your own module API without importing host-only table code

Current reference implementation:

- `modules/mod.example.package/src/module-data-tables.jsx`
- `modules/mod.example.package/src/api-handler.js`

## Imports

Most modules only need these imports:

```tsx
import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable
} from '@skitsaas/sdk';
```

Server-side query helpers are also available from the root SDK entry:

```ts
import { parseBuildTableQueryState } from '@skitsaas/sdk';
```

For source-host modules that want the same host treatment used by core tables, render the same definition with:

```tsx
import { DataTable } from '@/components/ui/data-table';
```

## Mental model

The normal setup is:

1. define a table with `defineBuildTable(...)`
2. render it with `<DataTable definition={table} />`
3. if the list is remote, set `source.url`
4. if a row needs mutations, use `buildTableAction.request(...)`
5. if a mutation is destructive, add `confirm`

In the common case, step 2 means the SDK renderer. In source-host modules, you can swap to the host `@/components/ui/data-table` when you want host presentation integration.

Use `buildTableColumn.custom(...)` or `buildTableAction.custom(...)` only when the default text/link/request primitives are not enough.

## Minimal local table

This is the smallest useful portable SDK table:

```tsx
'use client';

import { DataTable, buildTableColumn, defineBuildTable } from '@skitsaas/sdk';

const usersTable = defineBuildTable({
  data: [
    { id: 1, name: 'Ada Lovelace', status: 'active' },
    { id: 2, name: 'Grace Hopper', status: 'draft' }
  ],
  columns: [
    buildTableColumn.text({
      key: 'name',
      header: 'Name',
      searchable: true,
      sortable: true
    }),
    buildTableColumn.text({
      key: 'status',
      header: 'Status'
    })
  ],
  header: {
    title: 'Users',
    description: 'Simple local table rendered only from SDK.'
  },
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search users'
    }
  },
  pagination: {
    pageSize: 10
  }
});

export function UsersTable() {
  return <DataTable definition={usersTable} />;
}
```

## Header actions and custom header content

You can add default actions in the table header without writing extra wrapper UI:

```tsx
const table = defineBuildTable({
  data,
  columns,
  header: {
    title: 'Projects',
    description: 'Manage module projects.',
    actions: [
      buildTableAction.link({
        label: 'Create project',
        href: '/admin/projects/create'
      }),
      buildTableAction.button({
        label: 'Export',
        type: 'button'
      })
    ],
    content: <div className="text-sm text-muted-foreground">Custom summary</div>
  }
});
```

Use:

- `header.actions` for standard buttons and links
- `header.content` for extra JSX such as counters, badges, or custom summaries

The toolbar also supports `toolbar.actions` and `toolbar.content` for secondary controls.

## Row actions with default request handling

Row actions are the main replacement for module-specific action cells.

Use `buildTableColumn.actions(...)` so the table renders the action column for you:

```tsx
buildTableColumn.actions({
  key: 'actions',
  header: 'Actions',
  actions: (item) => [
    buildTableAction.link({
      label: 'Edit',
      href: `/admin/projects/${item.id}`
    }),
    buildTableAction.request({
      label: 'Delete',
      request: {
        url: `/api/modules/mod.example.projects/items/${item.id}`,
        method: 'DELETE',
        reload: true,
        successMessage: 'Project deleted.'
      },
      confirm: {
        title: 'Delete project?',
        description: `This removes "${item.title}".`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      }
    })
  ]
});
```

`buildTableAction.request(...)` already handles:

- `fetch(...)`
- request body serialization
- success/error notifications
- optional table reload after success
- confirm dialog when `confirm` is present

Supported request body formats:

- `json` (default)
- `formData`
- `searchParams`

## Remote search, filters, sorting, and pagination

To make the table fully ajax-driven, set `source.url`.

```tsx
const projectsTable = defineBuildTable({
  data: initialItems,
  columns: [
    buildTableColumn.text({
      key: 'title',
      header: 'Title',
      searchable: true,
      sortable: true
    }),
    buildTableColumn.text({
      key: 'status',
      header: 'Status',
      sortable: true
    }),
    buildTableColumn.text({
      key: 'updatedAt',
      header: 'Updated',
      sortable: true
    })
  ],
  source: {
    url: '/api/modules/mod.example.projects/items?scope=admin',
    debounceMs: 250
  },
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search projects',
      columns: ['title']
    },
    filters: [
      buildTableFilter.select({
        id: 'status',
        label: 'Status',
        column: 'status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' }
        ]
      })
    ]
  },
  pagination: {
    pageSize: 10,
    pageSizeOptions: [10, 25, 50]
  }
});
```

With `source.url` enabled, the SDK table sends query state to your endpoint and expects a response with:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

Default response keys:

- `items`
- `total`
- `page`
- `pageSize`

If your endpoint uses different names, map them with `source.response`:

```tsx
source: {
  url: '/api/modules/mod.example.projects/items',
  response: {
    itemsKey: 'data.rows',
    totalKey: 'data.total',
    pageKey: 'meta.page',
    pageSizeKey: 'meta.pageSize'
  }
}
```

## Server-side query parsing

On the server, parse the table query with `parseBuildTableQueryState(...)`.

```ts
import { parseBuildTableQueryState } from '@skitsaas/sdk';

function applyItemsTableQuery(items, searchParams) {
  const query = parseBuildTableQueryState(searchParams);
  const searchValue = query.search?.trim().toLowerCase() || '';
  const statusFilter = query.filters?.status?.trim().toLowerCase() || '';
  const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
  const pageSize =
    Number.isInteger(query.pageSize) && query.pageSize > 0 ? query.pageSize : 10;

  let filtered = [...items];

  if (searchValue) {
    filtered = filtered.filter((item) =>
      item.title.toLowerCase().includes(searchValue)
    );
  }

  if (statusFilter) {
    filtered = filtered.filter((item) => item.status === statusFilter);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize
  };
}
```

This is the same approach used in `modules/mod.example.package/src/api-handler.js`.

## Query contract

By default the SDK table uses these query parameters:

- `search`
- `sort`
- `dir`
- `page`
- `pageSize`
- `filter.<id>`

Example:

```text
/api/modules/mod.example.projects/items?search=ada&sort=updatedAt&dir=desc&page=2&pageSize=10&filter.status=active
```

If you need a different shape, set `source.queryOptions`.

```tsx
source: {
  url: '/api/modules/mod.example.projects/items',
  queryOptions: {
    searchKey: 'q',
    sortKey: 'orderBy',
    directionKey: 'orderDir',
    pageKey: 'p',
    pageSizeKey: 'limit',
    filterPrefix: 'where.'
  }
}
```

Parse the same shape on the server:

```ts
const query = parseBuildTableQueryState(searchParams, {
  searchKey: 'q',
  sortKey: 'orderBy',
  directionKey: 'orderDir',
  pageKey: 'p',
  pageSizeKey: 'limit',
  filterPrefix: 'where.'
});
```

## When to use custom cells

Default table primitives should cover most module tables:

- `buildTableColumn.text(...)`
- `buildTableColumn.actions(...)`
- `buildTableAction.link(...)`
- `buildTableAction.button(...)`
- `buildTableAction.request(...)`

Use `buildTableColumn.custom(...)` only when the cell truly needs custom JSX, for example:

- a status badge
- a composed avatar/title block
- a special link layout

The example module does this for its badge-based `status` cell in `modules/mod.example.package/src/module-data-tables.jsx`.

## Relationship with `createDataTableCrudApiRouter`

`createDataTableCrudApiRouter(...)` still exists in `@skitsaas/sdk/datatables`, but it is not the full `BuildTable` system.

Use it when you want help generating CRUD endpoints.

Use `BuildTable` when you want to define the client-side datatable itself:

- columns
- actions
- filters
- pagination
- remote source
- confirm flows

You can use both together, but they solve different layers.

## Recommended default

For most module datatables, start here:

1. Define the table with `defineBuildTable(...)`.
2. Render it with `<DataTable definition={...} />`.
3. Add `source.url` for ajax loading.
4. Add `toolbar.search`.
5. Add `buildTableColumn.actions(...)` for row actions.
6. Use `buildTableAction.request(...)` for delete/archive/toggle flows.
7. Add `confirm` for destructive actions.

That gives you a usable datatable with the SDK renderer. In source-host modules, you can also pass the same definition into `@/components/ui/data-table` when you want host theme slots, CTC wrappers, and host notification/confirm behavior.
