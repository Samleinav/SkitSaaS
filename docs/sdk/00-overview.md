---
title: SDK Overview
sidebar_position: 0
---

# SDK Overview

This SDK provides a **stable public contract** for external modules. It is split
into two layers so you can ship modules in **prebuilt**, **source-host**, or
**source-package** mode without depending on internal app paths (`@/lib/*`).

## Packages

### `@skitsaas/sdk`

Types + constants only.

Exports:

- `defineModule`
- `ModuleManifest`
- `ModuleRouteContext`
- `ModulePageHandler`
- `ModuleApiHandler`
- `ModuleNavItem`
- `ModuleWidgetDefinition`
- `ModuleEventHandler`
- `ModuleEventContext`
- `EventPayload`
- `EventEmitContext`
- `EventHook`
- `EVENT_HOOKS`
- `ModuleMessagesByArea` (module i18n bundles)

### `@skitsaas/sdk/server`

Optional server helpers.

Exports:

- `configureAuth`
- `getUser`
- `requireUser`
- `requireAdmin`
- `configureRevalidation`
- `revalidatePath`
- `revalidatePaths`
- `configureEventEmitter`
- `emitEvent`
- `emitEventAsync`
- `configureModuleConfig`
- `getModuleConfigValue`
- `setModuleConfigValue`
- `configureDatabase`
- `getDb`
- `findTable`
- `getTable`
- `listTables`
- `createModuleApiRouter`
- `createModulePageRouter`
- `createServerActionController`
- `createFormReader`
- `parseJsonBody`
- `isJsonRecord`
- `hasOwn`

### `@skitsaas/sdk/db`

Curated Drizzle exports via SDK entrypoint.

Examples:

- query helpers: `and`, `or`, `eq`, `desc`, `sql`
- pg-core builders: `pgTable`, `serial`, `varchar`, `integer`, `timestamp`

### `@skitsaas/sdk/build`

Node-only helper for `source-package` module build scripts.

Exports:

- `buildSourcePackageModule`

`buildSourcePackageModule({ moduleId })`:

- reads module `src/`
- transpiles `.ts/.tsx/.jsx` into `.js` under `dist/`
- copies static assets (`.js/.mjs/.cjs/.json/.css`)
- validates `dist/manifest.js`
- expects extensionless local imports in module source (for example `./data`)

### `@skitsaas/sdk/testing`

Node-only helpers for module-level tests.

Exports:

- `runSourcePackageContractChecks`
- `runSourcePackageTestSuite`

`runSourcePackageTestSuite(...)` runs SDK contract checks and then custom checks
provided by the module author.

## Module Modes

`module.json` now requires `moduleMode` to define how the host consumes the
module:

- `prebuilt`: module ships compiled `entry` (for example `dist/manifest.js`).
- `source-host`: module ships source and the host compiles it.
- `source-package`: module has its own `package.json`; `modules:build` compiles
  it first and host consumes only compiled `entry`.

### source-host modules

Use when you sell source code and want host-side compilation.

Structure:

- `modules/<moduleId>/src/manifest.ts`
- `modules/<moduleId>/module.json`

### prebuilt modules

Use when you ship compiled runtime artifacts without source.

Structure:

- `modules/<moduleId>/dist/manifest.js`
- `modules/<moduleId>/module.json`

### source-package modules

Use when module source has an isolated dependency/build pipeline.

Structure:

- `modules/<moduleId>/package.json`
- `modules/<moduleId>/src/*`
- `modules/<moduleId>/dist/manifest.js`
- `modules/<moduleId>/module.json`

Rules:

- `modules:build` runs `buildCommand` from `module.json`.
- if `testCommand` is declared, `modules:build` runs it after successful build.
- modules can use `@skitsaas/sdk/build` to keep `scripts/build.mjs` minimal.
- `modules:prepare` resolves only compiled `entry` for this mode.
- No fallback to `sourceEntry` is allowed for `source-package`.

## Module Metadata (`module.json`)

Example (`source-package`):

```json
{
  "moduleId": "mod.analytics",
  "version": "1.0.0",
  "moduleMode": "source-package",
  "entry": "dist/manifest.js",
  "buildCommand": "pnpm build",
  "sdkRange": "^0.1.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Mode contract:

1. `prebuilt`: requires `entry`.
2. `source-host`: requires `sourceEntry` (or default `src/manifest.*` candidates).
3. `source-package`: requires `entry`, `buildCommand`, and `sdkRange`.

`db` is optional. When present:

- `schemaVersion`: module-owned schema revision (integer >= 0)
- `migrationsDir`: module SQL migrations folder

## Custom Module Routes

Modules can expose friendly URLs via manifest aliases:

- `adminRouteAliases` (must be under `/admin/*`)
- `dashboardRouteAliases` (must be under `/dashboard/*`)

Rules:

- Aliases cannot collide with core routes (`/admin/users`, `/dashboard/security`, etc.).
- Aliases cannot overlap with another module alias.
- For navigation links, set `adminNavItems[].href` / `dashboardNavItems[].href` to the alias.

## Registry Automation

The host app uses a prebuild script to generate static imports:

```
pnpm modules:build
pnpm modules:prepare
```

This writes:

- `lib/modules/external.generated.ts`

The registry merges core + external modules automatically.

Module discovery uses:

1. `MODULES_DIR` env var (optional)
2. `/modules` (default)
3. `/examplemodules` (fallback for samples)

## Sync runtime state

After new modules are added, sync the DB table:

```
pnpm modules:sync
```

This creates missing rows in `app_modules` and keeps existing `enabled` rows
unchanged. New modules are enabled by default. To keep new modules installed
without enabling them:

```
MODULES_SYNC_ENABLE_NEW=false pnpm modules:sync
```

## Module DB migrations

Run module-owned migrations:

```
pnpm modules:migrate
```

Useful options:

- `pnpm modules:migrate --dry-run`
- `pnpm modules:migrate --module=mod.analytics`

## Module I18n

Modules can provide translations as JSON files, one per area and locale.

Locations:

- `modules/<moduleId>/i18n/<area>/<locale>.json`
- `modules/<moduleId>/dist/i18n/<area>/<locale>.json` (prebuilt)

Namespacing is required:

- Access under `messages.mod['mod.<moduleId>']`

Example JSON:

```json
{
  "title": "Analytics",
  "nav": {
    "overview": "Overview"
  }
}
```

Locales are inferred from filenames, so any locale is supported. Core messages
fall back to `DEFAULT_LOCALE` when a locale is missing.

Build registry:

```
pnpm modules:i18n
```

See `docs/modules/12-i18n.md` for full details.

## Server Helpers (Optional)

If a module needs auth/session, revalidation, events, or module config, the
host app should configure adapters once (server-only):

```ts
import {
  configureAuth,
  configureDatabase,
  configureEventEmitter,
  configureModuleConfig,
  configureRevalidation
} from '@skitsaas/sdk/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteAppConfigEntry,
  upsertAppConfigEntry
} from '@/lib/config/app-config-writes';
import {
  getAppConfigValueFromDb,
  inferAppConfigIsSecret,
  trimToNull
} from '@/lib/config/app-config';
import { db } from '@/lib/db/drizzle';
import {
  users,
  subscriptionAssignments,
  sysActivityLogs
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';

const ADMIN_ROLES = new Set(['owner', 'admin']);

async function requireDashboardUser() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  return user;
}

async function requireAdminDashboardUser() {
  const user = await requireDashboardUser();
  if (!ADMIN_ROLES.has(String(user.role ?? '').toLowerCase())) {
    redirect('/dashboard');
  }

  return user;
}

configureAuth({
  getUser,
  requireUser: requireDashboardUser,
  requireAdmin: requireAdminDashboardUser
});
configureRevalidation({ revalidatePath });

configureEventEmitter({ emitEvent, emitEventAsync });
configureModuleConfig({
  getConfigValue: getAppConfigValueFromDb,
  setConfigValue: async (namespace, configKey, configValue) => {
    const normalizedNamespace = namespace.trim();
    const normalizedConfigKey = configKey.trim();
    const normalizedValue = trimToNull(configValue);

    if (!normalizedValue) {
      await deleteAppConfigEntry({
        namespace: normalizedNamespace,
        configKey: normalizedConfigKey
      });
      return;
    }

    await upsertAppConfigEntry({
      namespace: normalizedNamespace,
      configKey: normalizedConfigKey,
      configValue: normalizedValue,
      isSecret: inferAppConfigIsSecret(normalizedConfigKey)
    });
  }
});
const TABLE_REGISTRY = new Map<string, unknown>([
  ['users', users],
  ['subscriptions', subscriptionAssignments],
  ['subscription_assignments', subscriptionAssignments],
  ['logs', sysActivityLogs],
  ['sys_activity_logs', sysActivityLogs]
]);
configureDatabase({
  getDb: () => db,
  getTable: (tableId) => {
    // tableId can be alias ("users", "subscriptions", "logs")
    // or db table name ("users", "subscription_assignments", etc.)
    return TABLE_REGISTRY.get(tableId) ?? null;
  },
  listTables: () => TABLE_REGISTRY.keys()
});
```

Then modules can use:

```ts
import {
  emitEventAsync,
  getDb,
  getTable,
  requireUser,
  revalidatePaths
} from '@skitsaas/sdk/server';

const user = await requireUser<{ id: number }>();
const db = getDb<any>();
const usersTable = getTable<any>('users');
await revalidatePaths(['/dashboard/custom/analytics']);

await emitEventAsync('email.smtp.sent', { module: 'mod.analytics' }, {
  source: 'mod.analytics',
  actorUserId: user.id
});
```

Declarative route registration for module API and module pages:

```ts
import {
  createModuleApiRouter,
  createModulePageRouter
} from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: () => Response.json({ ok: true })
    },
    {
      method: 'POST',
      path: '/items',
      auth: 'user',
      roles: ['admin', 'owner'],
      handler: ({ user }) => Response.json({ ok: true, userId: user?.id })
    }
  ]
});

export const dashboardPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => <div>Home</div> },
    { path: '/items/:itemId', auth: 'user', handler: ({ params }) => params.itemId }
  ]
});
```

And Drizzle through SDK:

```ts
import { and, eq, pgTable, serial, varchar } from '@skitsaas/sdk/db';
```

## Versioning

- SDK follows semver (`MAJOR.MINOR.PATCH`):
  - `MAJOR`: breaking SDK API/contract changes for modules.
  - `MINOR`: backwards-compatible feature additions.
  - `PATCH`: backwards-compatible fixes only.
- Modules should declare `sdkRange` in `module.json` (for example `^0.1.0`).
- `source-package` modules should keep `react`, `react-dom`, `next`,
  `@skitsaas/sdk` aligned as peers.
- `pnpm modules:build` runs in strict compatibility mode by default and validates
  `source-package` peer dependencies (`react`, `react-dom`, `next`, `@skitsaas/sdk`).
- `pnpm modules:prepare` runs in strict compatibility mode and fails on:
  - missing `sdkRange`
  - invalid semver range
  - incompatible range vs host SDK version (`app/sdk/package.json`)
- To run in warning mode only:

```bash
npx tsx scripts/modules-prepare.ts --warn-compat
```

## Build Checklist

1. Drop module in `modules/<moduleId>`.
2. Ensure `module.json` exists.
3. Run `pnpm modules:build`.
4. Run `pnpm modules:prepare`.
5. Run `pnpm modules:i18n`.
6. Build the app.

For step-by-step migration from legacy module imports to SDK-first patterns, see
`docs/sdk/01-sdk-first-migration.md`.
