---
title: BuildTable System
description: Technical design and current implementation status for BuildTable datatables across SDK and host renderers.
sidebar_position: 3
---

# BuildTable System

Status: Production-ready baseline for SDK-first datatables
Last review: 2026-03-08

This document explains the current `BuildTable` architecture and rollout status in SkitSaaS.

Current strategy in this repository:

- define table semantics in the SDK (`defineBuildTable`, columns, actions, filters, query helpers)
- use the SDK `DataTable` renderer as the default datatable renderer; it already covers the standard table feature set well
- use the host datatable adapter optionally in source-host modules when you want host theme/CTC integration

Current implementation lives in:

- `app/sdk/src/datatables/definition.ts`
- `app/sdk/src/datatables/state.ts`
- `app/sdk/src/datatables/query.ts`
- `app/sdk/src/datatables/remote.ts`
- `app/sdk/src/ui/data-table.tsx`
- `components/ui/data-table.tsx`

Current rollout examples:

- `app/(dashboard)/admin/users/columns.tsx`
- `app/(dashboard)/admin/payments/payment-data-columns.tsx`
- `app/(dashboard)/admin/logs/log-columns.tsx`
- `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx`
- `app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx`
- `modules/mod.example.package/README.md`

Related execution plan:

- `plans/build-table-sdk-system.md`

## Why this exists

The original SDK only exposed simple table rendering, while the host had a richer datatable implementation.

That created a split:

- core could use advanced datatable behavior
- modules could mostly render basic tables
- similar table features were reimplemented differently in host pages and modules
- module authors often had to fall back to custom renderers for actions, search, and mutation flows

`BuildTable` closes that gap by making the table contract itself part of the SDK.

The design goal is the same as `BuildForm`:

- define the UI contract once in the SDK
- reuse it in core and modules
- keep host-only theming and control slots as adapters, not as the only implementation path

## Standard boundary

`BuildTable` is now the default path for datatables that need:

- standard column rendering
- header actions
- toolbar search and filters
- sorting and pagination
- row actions
- request actions with confirm dialogs
- remote list loading against module or host APIs

It is intentionally not a full replacement for every possible grid.

Current intentional escape hatches:

- `buildTableColumn.custom(...)` for cells that require custom JSX
- `buildTableAction.custom(...)` for action UIs that do not fit link/button/request defaults
- host-only legacy `ColumnDef[]` mode in `components/ui/data-table.tsx` for routes not migrated yet

## Layered architecture

The architecture is split into four layers.

### 1. SDK definition contract

The SDK defines the portable table contract used by core and modules.

Primary types and helpers:

- `BuildTableDefinition`
- `BuildTableColumn`
- `BuildTableActionDefinition`
- `BuildTableFilterDefinition`
- `defineBuildTable(...)`
- `composeBuildTableDefinition(...)`
- `withBuildTableData(...)`
- `withBuildTableQuery(...)`
- `buildTableColumn.*`
- `buildTableAction.*`
- `buildTableFilter.*`

This layer is host-agnostic:

- no imports from `@/components/*`
- no assumptions about admin/dashboard runtime internals
- safe for `source-package` modules

### 2. Shared table state/query helpers

The SDK also owns reusable table state logic so both client and server work with the same query model.

Files:

- `app/sdk/src/datatables/state.ts`
- `app/sdk/src/datatables/query.ts`
- `app/sdk/src/datatables/remote.ts`

Responsibilities:

- normalize query state
- filter, sort, and paginate local datasets
- parse query strings from incoming requests
- serialize query state back into URL params
- resolve remote list URLs from `source.url`
- normalize remote API payloads
- build request descriptors for action mutations

That means module authors and host routes do not need to invent a separate query contract for table search/sort/filter/page.

## 3. Portable SDK renderer

The portable renderer is `DataTable` from `@skitsaas/sdk`.

Current responsibilities:

- render table headers and rows from `BuildTableDefinition`
- render header title, description, header actions, and header content
- render toolbar search, filters, toolbar actions, and toolbar content
- handle sorting changes
- handle pagination state
- load remote data when `source.url` is present
- execute request actions
- show confirm dialogs for destructive actions

For most module use cases, this is the main entrypoint:

```tsx
import { DataTable, defineBuildTable } from '@skitsaas/sdk';
```

## 4. Host adapter and theme integration

The host-side datatable adapter is `components/ui/data-table.tsx`.

Source-host modules can import this adapter directly when they want the same visual/runtime behavior used by core admin/dashboard tables.

It now supports two modes:

- legacy TanStack `ColumnDef[]` mode
- SDK `definition` mode using `BuildTableDefinition`

When `definition` mode is used, the host adapter keeps:

- `ui.table` payload handling
- `ui.table.control` slot wrappers
- theme/runtime integration for admin and dashboard areas
- host notifications and confirm dialog rendering

This keeps the theme and CTC integration in the host, while the semantic table contract stays in the SDK.

Optional source-host pattern:

```tsx
import { buildTableColumn, defineBuildTable } from '@skitsaas/sdk';
import { DataTable } from '@/components/ui/data-table';
```

## Current feature set

The current `BuildTable` contract already supports:

- local tables with `data`
- remote tables with `source.url`
- text/select filters
- table search
- column sorting
- pagination and page size
- header actions
- toolbar actions
- custom header and toolbar content
- row action columns
- request actions with `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- request body formats: `json`, `formData`, `searchParams`
- confirm dialogs on button and request actions
- response key mapping for remote list payloads
- query key mapping for custom API parameter conventions

## Recommended usage patterns

For new module or host datatables, prefer this order:

1. Start with `defineBuildTable(...)`.
2. Use `buildTableColumn.text(...)` for normal columns.
3. Use `buildTableColumn.actions(...)` for row mutations/navigation.
4. Use `buildTableAction.request(...)` for server mutations.
5. Add `confirm` when the mutation is destructive or high-impact.
6. Add `source.url` when the dataset should be driven remotely.
7. Parse the same query shape on the server with `parseBuildTableQueryState(...)`.

Reserve custom renderers for cases where the default SDK contract is materially insufficient.

## Current rollout state

The rollout is already past proof-of-concept.

Core routes now use `BuildTableDefinition` in multiple admin/dashboard tables through the host adapter, and the `mod.example.package` source-package module uses the same contract through the portable SDK renderer for:

- remote list loading
- row action rendering
- confirm-backed delete actions

This is the important boundary change:

- advanced table behavior is no longer host-only
- module datatables can now be defined entirely from the SDK

## Remaining follow-up

The current implementation is usable now, but these are still open follow-up areas:

- align `createDataTableCrudApiRouter(...)` more directly with the shared `BuildTable` query contract
- continue migrating remaining legacy host tables
- add more optional table metadata primitives only when a real consumer needs them

Shared table semantics should continue to grow from the SDK contract first. Source-host modules can still opt into the host adapter for theme/runtime integration without changing the table definition layer.
