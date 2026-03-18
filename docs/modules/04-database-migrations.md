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
  "sdkRange": "^1.3.5",
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

SDK-first policy:

- do not import `@/lib/db/schema` from a module just to reference a host table
- when a module needs an FK to a host table such as `users`, `teams`, or
  `sfiles`, define a minimal local stub with the same table name and referenced
  primary key column
- keep the module-owned table itself under the module prefix (`mod_<module>_*`)

Example:

```ts
import { integer, pgTable, serial, text } from '@skitsaas/sdk/db';

const users = pgTable('users', {
  id: integer('id').primaryKey()
});

export const modComments = pgTable('mod_example_comments', {
  id: serial('id').primaryKey(),
  ownerUserId: integer('owner_user_id').references(() => users.id, {
    onDelete: 'cascade'
  }),
  body: text('body').notNull()
});
```

## Advanced PostgreSQL types

For SDK-first modules, prefer `@skitsaas/sdk/db` even when you need advanced
column types such as `vector`.

- `@skitsaas/sdk/db` re-exports `customType(...)`
- modules can define a local custom type without importing
  `drizzle-orm/pg-core` directly
- this keeps advanced schema code compatible with both `source-host` and future
  `source-package` migration

Example:

```ts
import {
  customType,
  integer,
  pgTable,
  serial,
  text
} from '@skitsaas/sdk/db';

const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  }
});

const sfiles = pgTable('sfiles', {
  id: integer('id').primaryKey()
});

export const embeddingDocs = pgTable('mod_example_embedding_docs', {
  id: serial('id').primaryKey(),
  sourceFileId: integer('source_file_id').references(() => sfiles.id),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull()
});
```

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
