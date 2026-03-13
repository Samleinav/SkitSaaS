---
title: SDK-First Migration Guide
sidebar_position: 1
---

# SDK-First Migration Guide

This guide describes how to migrate an existing module toward the public SDK
contract. In this repository, that usually means a `source-host` module that
uses SDK contracts first and keeps host imports only for surfaces that truly
remain host-only.

## Target State

After migration, module code should depend on:

- `@skitsaas/sdk` for manifest/types/events, forms, datatables, typed route factories (`RouteAdmin`, `RouteDashboard`, etc.), and rate limiting (`withRateLimit`, `configureRateLimitBackend`)
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
  "sdkRange": "^1.3.5"
}
```

`pnpm modules:prepare` now runs strict compatibility checks and fails when
`sdkRange` is missing/invalid/incompatible.

For this repo, keep `moduleMode: "source-host"` as the default unless you
explicitly need isolated packaging/build.

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

For host-owned tables (for example users/subscriptions/logs), use `getTable('users')`
or the table alias configured by host bootstrap instead of importing root schema.

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

Replace any custom per-route rate limit logic with `withRateLimit` from the SDK:

```ts
import { withRateLimit } from '@skitsaas/sdk'

export const myHandler = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  async (request) => Response.json({ ok: true })
)
```

Never import from `@/lib/routing/rate-limit` in module code — that path is host-only.

## Migration Checklist

- [ ] Source-package modules have no `@/...` imports.
- [ ] Source-host modules use host imports only where the SDK still has no public surface.
- [ ] BuildForm and `TemplateBuildForm` imports stay on `@skitsaas/sdk` for normal module code.
- [ ] Module declares `moduleMode` in `module.json`.
- [ ] Module declares `sdkRange` in `module.json`.
- [ ] Routes use `RouteAdmin`/`RouteDashboard` from SDK — no hardcoded strings.
- [ ] Rate limiting uses `withRateLimit` from SDK.
- [ ] Server actions use `createValidatedServerActionController` from `@skitsaas/sdk/server`.
- [ ] Module builds and resolves through dispatcher routes.
- [ ] Module tests pass after migration.
