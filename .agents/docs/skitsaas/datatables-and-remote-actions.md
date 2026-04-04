---
title: "Datatables And Remote Actions"
sidebar_position: 0
---

# Datatables And Remote Actions

BuildTable is the table-side counterpart to BuildForm.

When the task is a list screen, admin table, dashboard records view, remote
filtering, or row-level actions, start here.

## Core Mental Model

BuildTable separates:

1. table definition
2. query and state helpers
3. renderer
4. host bridge and theme integration

## Contract Layer

Key files:

- `app/sdk/src/datatables/definition.ts`
- `app/sdk/src/datatables/state.ts`
- `app/sdk/src/datatables/query.ts`
- `app/sdk/src/datatables/remote.ts`
- `app/sdk/src/datatables/crud.ts`

Main concepts:

- `defineBuildTable(...)`
- `buildTableColumn.*`
- `buildTableAction.*`
- query parsing and serialization helpers
- remote source definition

## Renderer Layer

Portable renderer:

- `app/sdk/src/ui/data-table.tsx`

Host renderer and bridge:

- `components/ui/data-table.tsx`
- `components/ui/sdk-data-table-provider.tsx`

Inside SkitSaaS, SDK `DataTable` can delegate to the host table adapter
automatically.

## Supported Patterns

BuildTable is designed for:

- local datasets
- remote list endpoints
- search
- filters
- sorting
- pagination
- header and toolbar actions
- row actions
- request-backed actions with confirm dialogs

## Server Pairing

For remote tables:

- define a `source.url`
- parse the same query shape on the server
- return a compatible payload for list rows plus pagination metadata

The contract already includes helpers for:

- query parsing
- query serialization
- request descriptor building
- normalizing remote list responses

## Copyable Remote Table Pattern

The clearest minimal repo example today is `modules/mod.example.dashboard`.

Client-side table definition:

```ts
const playbooksTable = defineBuildTable({
  columns: [
    buildTableColumn.text({ key: 'title', header: 'Playbook', searchable: true, sortable: true }),
    buildTableColumn.text({ key: 'owner', header: 'Owner', searchable: true })
  ],
  source: {
    url: '/api/modules/mod.example.dashboard/showcase-playbooks',
    debounceMs: 200
  },
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search playbooks',
      columns: ['title', 'owner']
    }
  },
  pagination: {
    pageSize: 5,
    pageSizeOptions: [5, 10]
  }
});
```

Server-side typed route pairing:

```ts
function applyQuery(searchParams: URLSearchParams) {
  const query = parseBuildTableQueryState(searchParams);
  const page = typeof query.page === 'number' && query.page > 0 ? query.page : 1;
  const pageSize =
    typeof query.pageSize === 'number' && query.pageSize > 0 ? query.pageSize : 5;

  let items = [...listPlaybooks()];

  if (query.search) {
    const searchValue = query.search.trim().toLowerCase();
    items = items.filter((item) =>
      [item.title, item.owner]
        .some((value) => String(value).toLowerCase().includes(searchValue))
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize
  };
}
```

That response shape is the practical baseline remote `DataTable` expects:

- `items`
- `total`
- `page`
- `pageSize`

## Legacy And Host-Only Mode

`components/ui/data-table.tsx` still supports legacy `ColumnDef[]` usage.
That path remains useful for routes that have not migrated or truly need
host-only table behavior.

For new module work, prefer SDK `BuildTable` first.

## Good Default Strategy

1. define the table semantics in the SDK contract
2. use SDK `DataTable`
3. let the host bridge add richer runtime behavior automatically
4. fall back to direct host usage only when a clear host-only need exists

## Common Mistakes

- rebuilding table query parsing from scratch
- inventing a different filter or sorting contract than the SDK already uses
- defaulting to direct host `ColumnDef[]` mode for a portable module
- forgetting that request actions and confirm flows already exist in BuildTable
