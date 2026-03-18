---
title: SDK-First Migration Guide
sidebar_position: 1
---

# SDK-First Migration Guide

This guide describes how to migrate an existing module toward the public SDK
contract. In this repository, that usually means a `source-host` module that
uses SDK contracts first and keeps host imports only for surfaces that truly
remain host-only.

## Current Reality vs Target Architecture

Current repo reality:

- many existing modules still run as `source-host`
- some older slices still carry direct `@/...` imports for historical gaps

Target architecture:

- the long-term goal is `source-package` portability
- every shared capability should come from `@skitsaas/sdk`,
  `@skitsaas/sdk/server`, `@skitsaas/sdk/db`, or `@skitsaas/sdk/sfiles`
- any direct host import left in a `source-host` module should be treated as
  migration debt, not as the preferred final design

## Target State

After migration, module code should depend on:

- `@skitsaas/sdk` for manifest/types/events, forms, datatables, typed route factories (`RouteAdmin`, `RouteDashboard`, `RouteApi`, etc.), typed API rate limiting (`.rateLimit(...)`), and manual/standalone rate limiting (`withRateLimit`, `configureRateLimitBackend`)
- `@skitsaas/sdk/server` for server capabilities (auth, revalidate, config, DB adapter, `createValidatedServerActionController`, `createModuleApiRouter`)
- `@skitsaas/sdk/db` for Drizzle query/table helpers

For `source-package` modules, avoid host internals entirely. For `source-host`
modules, prefer the SDK for shared contracts and keep direct host imports only
where the capability is genuinely not exposed publicly. BuildForm and
`TemplateBuildForm` should now stay on SDK imports for normal module code.

## 1. Update `module.json`

Declare SDK compatibility explicitly:

```json
{
  "moduleId": "mod.analytics",
  "version": "1.2.0",
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.12.0"
}
```

`pnpm modules:prepare` now runs strict compatibility checks and fails when
`sdkRange` is missing/invalid/incompatible.

For an existing module, `source-host` is still the easiest intermediate step.
For the end state, prefer `source-package`.

Target manifest shape once the module is fully package-portable:

```json
{
  "moduleId": "mod.analytics",
  "version": "1.2.0",
  "moduleMode": "source-package",
  "entry": "dist/manifest.js",
  "buildCommand": "pnpm build",
  "testCommand": "pnpm test",
  "sdkRange": "^1.12.0"
}
```

## 2. Replace Contract Imports

Use SDK contract imports for manifest and shared types:

```ts
import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
```

Avoid importing host copies from `lib/modules/manifest.ts` or other internal paths.

For source-host modules, this does not forbid all `@/...` imports. It means:

- use SDK types/contracts when a stable shared surface already exists
- keep host imports only for genuinely host-only UI/runtime surfaces

## 3. Replace Server Capability Imports

If the module used auth/session/revalidation/events/config via host internals,
switch to SDK server helpers:

```ts
import {
  getUser,
  requireUser,
  revalidatePaths,
  emitEventAsync,
  getModuleConfigValue,
  setModuleConfigValue,
  getDb,
  getTable
} from '@skitsaas/sdk/server';
```

The host configures these adapters in `lib/modules/sdk-server-bootstrap.ts`.

## 4. Replace Direct Drizzle Imports

Use Drizzle from SDK entrypoint:

```ts
import { and, eq, desc, pgTable, serial, varchar } from '@skitsaas/sdk/db';
```

This keeps module code tied to SDK surface instead of direct root dependency paths.

## 5. Keep Module-Owned DB Logic in the Module

For module-owned tables:

- define schema under module (`modules/<id>/db/schema.ts`)
- keep queries/actions in module source
- use `db` + module tables directly from SDK adapters/helpers

For host-owned tables used in query code, use `getTable('users')` or the table
alias configured by host bootstrap instead of importing root schema.

For schema-level foreign keys, do not import `@/lib/db/schema`. Define a small
local stub instead:

```ts
import { integer, pgTable } from '@skitsaas/sdk/db';

const users = pgTable('users', {
  id: integer('id').primaryKey()
});
```

If the module needs an advanced PostgreSQL type such as `vector`, use
`customType(...)` from `@skitsaas/sdk/db` rather than importing
`drizzle-orm/pg-core` directly.

## 6. Validate in Local Pipeline

Run:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

If `modules:prepare` fails with SDK compatibility errors, adjust `sdkRange` or
upgrade the module to the active SDK API.

## 7. Optional: Source-Package Modules

When the module has its own `package.json` and build pipeline (`moduleMode:
source-package`):

- keep `react`, `react-dom`, `next`, `@skitsaas/sdk` as peer dependencies
- declare `buildCommand` in `module.json`
- optionally declare `testCommand` in `module.json` to run module tests in `modules:build`
- prefer `@skitsaas/sdk/build` in `<module-root>/scripts/build.mjs` for `src -> dist` transpile/copy
- prefer `@skitsaas/sdk/testing` in `tests/` to combine SDK checks with module-specific checks
- publish/ship compiled runtime entry (`dist/manifest.js` or equivalent)
- keep `sdkRange` aligned with host SDK version policy
- `modules:build` validates those peers in strict mode by default

## 8. Routes (typed, SDK-first)

Replace hardcoded strings with typed route factories:

```ts
// Before
adminRouteAliases: ['/admin/custom/my-module']

// After
import { RouteAdmin } from '@skitsaas/sdk'
export const MyModuleRoutes = {
  admin: { home: RouteAdmin('/custom/my-module').name('my-module.admin.home') }
} as const

// In manifest:
adminRouteAliases: [String(MyModuleRoutes.admin.home)]
```

Module `routes.ts` files import only from `@skitsaas/sdk` — no `@/lib/routing/area-setup` needed.
Host bootstrap now wires routing defaults from host entrypoints (`core/routes.ts`,
`core/api-routes.ts`, module registry, portal registry, and API bridge helpers).
For page or portal role restrictions, prefer `.roles('teacher')` / `.roles('owner')`
on the SDK route builder instead of importing `proxyRoles(...)` from core.

## 9. Rate limiting (SDK-first)

For typed module `apiRoutes`, prefer builder-level rate limits:

```ts
import { RouteApi } from '@skitsaas/sdk'

const BASE = '/modules/mod.analytics';

export const ApiRoutes = {
  create: RouteApi(`${BASE}/items`)
    .POST()
    .auth('admin')
    .rateLimit({ limit: 10, windowSeconds: 60 })
    .name('mod.analytics.api.items.create')
} as const;
```

Use `withRateLimit` from the SDK when the module still uses
`createModuleApiRouter(...)` or a standalone handler:

```ts
import { withRateLimit } from '@skitsaas/sdk'

export const myHandler = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  async (request, context) => Response.json({ ok: true })
)
```

Never import from `@/lib/routing/rate-limit` in module code — that path is
host-only.

## 10. Replace Host Storage Imports

If a module still imports `@/lib/sfiles`, `@/lib/sfiles/api-actor`, or host
storage helpers directly, move it to the SDK storage path.

Server-side path when the current request actor is enough:

```ts
import { getCurrentSfiles } from '@skitsaas/sdk/server';

const sfiles = await getCurrentSfiles();
const artifact = await sfiles.upload(buffer, 'artifact.json', {
  folder: '/modules/mod.analytics/artifacts/',
  visibility: 'private'
});

const loaded = await sfiles.read(artifact.id);
await sfiles.delete(artifact.id);
```

When the module already resolved its own actor:

```ts
import { bindSfilesActor, sfiles } from '@skitsaas/sdk/sfiles';

const actorSfiles = bindSfilesActor({ userId, isAdmin: false }, sfiles);
const url = await actorSfiles.getUrl(fileId);
```

Keep these rules:

- modules use SDK storage helpers only
- permission checks remain in the host manager
- do not instantiate host adapters inside module code
- use `read(...)` for private binary access instead of custom host-only file
  loaders

## 11. Common Before / After Replacements

### Server i18n

Before:

```ts
import { getServerTranslator } from '@/lib/i18n/server';
```

After:

```ts
import { getServerTranslator } from '@skitsaas/sdk/server';

const t = await getServerTranslator({ moduleId: 'mod.analytics' });
```

### Storage

Before:

```ts
import { getApiActorSfilesManager } from '@/lib/sfiles/api-actor';
```

After:

```ts
import { getCurrentSfiles } from '@skitsaas/sdk/server';

const sfiles = await getCurrentSfiles();
const file = await sfiles.read(fileId);
```

### Plan feature reads

Before:

```ts
// module code reaches billing/subscription tables directly
```

After:

```ts
import {
  getPlanFeatureNumber,
  getPlanFeatureValue
} from '@skitsaas/sdk/server';

const seats = await getPlanFeatureNumber('mod.analytics.seats.max', {
  scope: 'organization',
  teamId
});
const mode = await getPlanFeatureValue('mod.analytics.mode', {
  scope: 'organization',
  teamId
});
```

## 12. Temporary Exceptions vs Must Migrate

Temporary exceptions still tolerated in `source-host`:

- host-only UI/runtime seams that do not yet have a public SDK surface
- short-lived compatibility wrappers while an SDK gap is being closed

Must migrate now when an SDK surface already exists:

- server i18n via `@skitsaas/sdk/server`
- storage access via `@skitsaas/sdk/sfiles` or `getCurrentSfiles()`
- plan feature reads via `getPlanFeatureValue(...)` / `getPlanFeatureNumber(...)`
- Drizzle helpers and advanced schema types via `@skitsaas/sdk/db`
- host-table schema FKs via local stubs instead of `@/lib/db/schema`

## 13. Source-Host To Source-Package Exit Checklist

Audit commands:

```bash
rg -n "from '@/|from \"@/" modules/mod.analytics
rg -n "drizzle-orm/pg-core|@/lib/db/schema|@/lib/sfiles|@/lib/i18n" modules/mod.analytics
```

Migration checklist:

- [ ] Source-package modules have no `@/...` imports.
- [ ] Source-host modules use host imports only where the SDK still has no public surface.
- [ ] BuildForm and `TemplateBuildForm` imports stay on `@skitsaas/sdk` for normal module code.
- [ ] Module declares `moduleMode` in `module.json`.
- [ ] Module declares `sdkRange` in `module.json`.
- [ ] Routes use `RouteAdmin`/`RouteDashboard` from SDK — no hardcoded strings.
- [ ] Typed module APIs use `RouteApi(...).rateLimit(...)` where possible.
- [ ] Legacy `createModuleApiRouter(...)` or standalone handlers use `withRateLimit` from SDK.
- [ ] Server actions use `createValidatedServerActionController` from `@skitsaas/sdk/server`.
- [ ] Server pages/actions use `getServerTranslator(...)` / `getActionTranslator(...)` from SDK.
- [ ] Plan-derived feature reads use `getPlanFeatureValue(...)` / `getPlanFeatureNumber(...)`.
- [ ] Storage-heavy modules use `@skitsaas/sdk/sfiles` / `getCurrentSfiles()` instead of `@/lib/sfiles*`.
- [ ] Schema code uses `@skitsaas/sdk/db` only, including `customType(...)` when needed.
- [ ] Host-table FKs use local table stubs instead of `@/lib/db/schema`.
- [ ] `source-package` manifest fields (`entry`, `buildCommand`, `sdkRange`) are present before flipping `moduleMode`.
- [ ] Module `package.json` exposes the required peers (`react`, `react-dom`, `next`, `@skitsaas/sdk`).
- [ ] `pnpm modules:build`, `pnpm modules:prepare`, and module tests pass after the migration.
- [ ] Module builds and resolves through dispatcher routes.
- [ ] Module tests pass after migration.
