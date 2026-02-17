---
title: Module Ops Runbook
sidebar_position: 10
---

# Module Ops Runbook

## Enable or disable a module

Use SQL (or an admin script if you add one):

```sql
update app_modules
set status = 'enabled', enabled_at = now(), updated_at = now()
where module_id = 'ops.diagnostics';
```

Disable:

```sql
update app_modules
set status = 'disabled', updated_at = now()
where module_id = 'ops.diagnostics';
```

## Sync app_modules

Use the sync script to upsert rows for all registered modules:

```
pnpm modules:sync
```

By default this **preserves enabled modules** and inserts new modules as
`enabled`. To keep new modules installed (but disabled):

```
MODULES_SYNC_ENABLE_NEW=false pnpm modules:sync
```

If the sync hangs (DB is unreachable), set a shorter timeout:

```
MODULES_SYNC_TIMEOUT_MS=5000 pnpm modules:sync
```

## Validate runtime

Run:

```
pnpm restructure:module-runtime
```

This checks registry vs DB state and surfaces missing manifests or invalid statuses.

## Dispatcher smoke

Admin and dashboard module pages should 404 when disabled.

Suggested checks:

- `/admin/modules/ops.diagnostics`
- `/dashboard/modules/ops.diagnostics`

## Evidence

Use canary packs for periodic evidence:

- `docs/ops-canary-pack.md`
- `pnpm restructure:evidence`
