---
title: Database and Migrations
sidebar_position: 4
---

# Database and Migrations

## Table naming

Module tables should be prefixed:

- `mod_<module_id>_*`

Examples:

- `mod_analytics_reports`
- `mod_licenses_api_keys`

This keeps ownership clear and avoids collisions.

## Schema changes (phase-1 model)

Module-owned DB assets should live inside the module:

- `modules/<moduleId>/db/migrations/*`
- optional `modules/<moduleId>/db/schema.ts`
- optional `modules/<moduleId>/db/seed.ts`

In `module.json`, declare:

```json
{
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^0.1.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Apply module migrations:

```
pnpm modules:migrate
```

Dry-run and module filter:

```
pnpm modules:migrate --dry-run
pnpm modules:migrate --module=mod.analytics
```

Compatibility note:

- core tables still use the core migration pipeline (`pnpm db:generate`, `pnpm db:migrate`)
- module tables must be owned by module migrations (`modules/<moduleId>/db/migrations/*`)
- do not add module tables to `lib/db/schema.ts`
- legacy environments that already applied older core migrations for a module remain compatible

## Foreign keys

It is fine to reference core tables (`users`, `teams`, `payment_orders`) if needed. Keep constraints explicit and avoid circular dependencies.

## Rollback strategy

If you uninstall a module:

- create a migration to drop its tables (or keep data and just disable)
- update registry if module is removed from code

Recommended uninstall modes:

- disable: keep tables and data
- uninstall keep-data: remove runtime rows, keep tables
- uninstall purge: drop tables and data

## Seeds

If your module needs initial data, add a seed path in `lib/db/seed.ts` or a dedicated script. Keep it idempotent.
