---
title: "SDK-First Migration"
sidebar_position: 0
---

# SDK-First Migration

Use this page when an existing module still imports host internals and you want
to migrate it toward cleaner SDK-first boundaries.

## Current Reality Versus Target

Current repo reality:

- many modules still run as `source-host`
- some slices still use direct `@/...` imports because those gaps existed first

Target architecture:

- `source-package` is the long-term portability target
- `source-host` modules should still use SDK contracts first
- host imports that remain should be treated as migration debt, not ideal
  architecture

## Migration Goal

After migration, shared capabilities should come from:

- `@skitsaas/sdk`
- `@skitsaas/sdk/server`
- `@skitsaas/sdk/db`
- `@skitsaas/sdk/build`
- `@skitsaas/sdk/testing`

## Step 1: Declare Module Mode And SDK Range

Make the module metadata explicit first.

Typical `source-host` shape:

```json
{
  "moduleId": "mod.analytics",
  "version": "1.2.0",
  "moduleMode": "source-host",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.12.0"
}
```

That makes compatibility visible to the host pipeline.

## Step 2: Replace Contract Imports First

Move manifest/types to the SDK before anything else.

Good example:

```ts
import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
```

This is the easiest way to stop a module from depending on private manifest
copies.

## Step 3: Replace Server Capability Imports

If the module currently reaches into host auth, config, revalidation, events,
or DB helpers, move those reads to SDK server helpers first.

Good targets:

- `requireUser`
- `requireAdmin`
- `revalidatePaths`
- `emitEventAsync`
- `getModuleConfigValue`
- `setModuleConfigValue`
- `getDb`
- `getAdminDb`
- `getTable`

## Step 4: Replace Direct Drizzle Imports

Move module query and schema helpers to:

```ts
import { eq, and, pgTable } from '@skitsaas/sdk/db';
```

This keeps the module tied to the public DB surface instead of direct root
dependency paths.

## Step 5: Keep Module DB Ownership In The Module

Even while migrating, keep:

- schema under `db/*`
- queries inside the module
- module tables documented in the module README

Migration should reduce coupling, not scatter ownership.

## Step 6: Replace UI Contracts Before Rewriting UI

For forms:

- move to SDK BuildForm contracts
- move to SDK validation helpers
- use `TemplateBuildForm` or `BuildForm`

For tables:

- move to SDK BuildTable contracts
- use SDK `DataTable`

This is one of the highest-value migration steps because it removes a lot of
host-only imports quickly.

## Step 7: Replace Route Strings With Route Factories

Move hardcoded route strings to SDK factories.

Good example:

```ts
import { RouteAdmin } from '@skitsaas/sdk';

export const MyRoutes = {
  home: RouteAdmin('/custom/my-module').name('my-module.admin.home')
} as const;
```

This cleans up aliases and prepares the module for better route registry usage.

## Step 8: Decide Whether To Stop At `source-host` Or Continue To `source-package`

Stopping point:

- the module is still host-coupled
- but shared contracts are now SDK-first

End-state target:

- `source-package`
- compiled `dist/*`
- own build pipeline
- no direct host imports for host/platform capabilities

## Validation Flow

Normal validation path:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

If the migration is still `source-host`, `modules:prepare` and `tsc` are often
the most valuable first checks.

## Migration Smells

Treat these as unfinished migration debt:

- direct host imports for forms or tables that the SDK already covers
- direct host auth/config helpers where SDK server helpers already exist
- route strings duplicated across pages and manifest
- module DB tables documented as if they belonged to host docs

## Practical Rule

Do not try to jump from messy `source-host` directly to perfect portability in
one rewrite.

The better sequence is:

1. make the module SDK-first inside `source-host`
2. isolate the remaining host-only gaps
3. move to `source-package` only when those gaps are small enough

## Related Docs

- `./overview.md`
- `../modules-and-sdk-boundaries.md`
- `../modules-development/source-host-worked-example.md`
- `../modules-development/source-package-worked-example.md`
