---
title: Module Ops Runbook
sidebar_position: 10
---

# Module Ops Runbook

## Enable or disable a module

For quick admin dispatcher smoke checks, use the built-in `ops.diagnostics`
module from the core registry.

If the `app_modules` row does not exist yet, run `pnpm modules:sync` first or
use the helper script below.

```sql
update app_modules
set status = 'enabled', enabled_at = now(), disabled_at = null, updated_at = now()
where module_id = 'ops.diagnostics';
```

Disable:

```sql
update app_modules
set status = 'disabled', updated_at = now()
where module_id = 'ops.diagnostics';
```

Helper script:

```bash
npx tsx scripts/restructure-toggle-ops-module.ts enable
npx tsx scripts/restructure-toggle-ops-module.ts disable
```

The helper validates the target module against the registry and derives the
default version/install mode from the manifest.

To target a different registered module instead:

```bash
MODULE_ID=<real-module-id> MODULE_VERSION=<module-version> npx tsx scripts/restructure-toggle-ops-module.ts enable
MODULE_ID=<real-module-id> npx tsx scripts/restructure-toggle-ops-module.ts disable
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

`ops.diagnostics` only ships an admin page. Its admin route should 404 when
disabled.

Suggested checks:

- `/admin/modules/ops.diagnostics`
- `/dashboard/modules/<real-module-id>` when you explicitly choose a module that defines `dashboardPage`

## Evidence

Use canary packs for periodic evidence:

- `docs/operations/ops-canary-pack.md`
- `pnpm restructure:evidence`
