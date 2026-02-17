---
title: SDK-First Migration Guide
sidebar_position: 1
---

# SDK-First Migration Guide

This guide describes how to migrate an existing module from host-internal
imports (`@/lib/*`, `@/app/*`) to the public SDK contract.

## Target State

After migration, module code should depend on:

- `@skitsaas/sdk` for manifest/types/events
- `@skitsaas/sdk/server` for server capabilities (auth, revalidate, config, DB adapter)
- `@skitsaas/sdk/db` for Drizzle query/table helpers

And should **not** import host internals from module source files.

## 1. Update `module.json`

Declare SDK compatibility explicitly:

```json
{
  "moduleId": "mod.analytics",
  "version": "1.2.0",
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^0.1.0"
}
```

`pnpm modules:prepare` now runs strict compatibility checks and fails when
`sdkRange` is missing/invalid/incompatible.

## 2. Replace Contract Imports

Use SDK contract imports for manifest and shared types:

```ts
import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
```

Avoid importing host copies from `lib/modules/manifest` or other internal paths.

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
- prefer `@skitsaas/sdk/build` in `scripts/build.mjs` for `src -> dist` transpile/copy
- prefer `@skitsaas/sdk/testing` in `tests/` to combine SDK checks with module-specific checks
- publish/ship compiled runtime entry (`dist/manifest.js` or equivalent)
- keep `sdkRange` aligned with host SDK version policy
- `modules:build` validates those peers in strict mode by default

## Migration Checklist

- [ ] No `@/lib/*` imports in module source.
- [ ] No `@/app/*` imports in module source.
- [ ] Module declares `moduleMode` in `module.json`.
- [ ] Module declares `sdkRange` in `module.json`.
- [ ] Module builds and resolves through dispatcher routes.
- [ ] Module tests pass after migration.
