---
name: mod-source-package-foundation
description: Bootstrap, structure, and configure source-package modules for SkitSaaS. Use this skill when creating a new module, setting up module.json, configuring the SDK build pipeline, or onboarding an existing module to source-package mode.
---

# mod-source-package-foundation

## Scope

Module creation, `module.json`, `package.json`, manifest file, SDK compat, and the full build/prepare/migrate/sync pipeline for `source-package` modules.

## Required References

- `docs/modules/13-source-package-template.md` — minimal structure + `module.json` / `package.json` templates
- `docs/modules/00-overview.md` — runtime registry, module modes, build pipeline commands
- `docs/sdk/00-overview.md` — SDK entry points, versioning, `sdkRange` rules, `buildSourcePackageModule`

## Module Boundary Rules (MANDATORY)

These rules apply to ALL files under `modules/<moduleId>/`:

```
FORBIDDEN imports:
  @/app/*
  @/lib/*
  @/components/*
  @/config/*

ALLOWED imports:
  ./*, ../*           (module-local)
  @skitsaas/sdk       (client-safe contracts)
  @skitsaas/sdk/server (server helpers — server files only)
  @skitsaas/sdk/db    (drizzle helpers)
  @skitsaas/sdk/build (build scripts only)
  third-party packages declared in module's own package.json
```

If a capability exists only in host internals → stop, log the SDK gap in `docs/reference/05-sdk-changelog.md`, escalate to `core-sdk-evolution` before continuing.

DB access: always use `getAdminDb()` from `@skitsaas/sdk/server`. See `core-security-auth` for rationale.

## Minimal Directory Structure

```
modules/
  mod.<id>/
    module.json
    package.json
    scripts/build.mjs
    tests/module-contract.test.mjs
    src/
      manifest.ts
    dist/
      manifest.js
```

## module.json (source-package)

```json
{
  "moduleId": "mod.<id>",
  "version": "0.1.0",
  "moduleMode": "source-package",
  "entry": "dist/manifest.js",
  "buildCommand": "pnpm build",
  "testCommand": "pnpm test:module",
  "sdkRange": "^1.4.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

Required fields: `moduleMode`, `entry`, `buildCommand`, `sdkRange`.

## package.json (source-package)

```json
{
  "name": "mod.<id>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node ./scripts/build.mjs",
    "test:module": "node --test tests/module-contract.test.mjs"
  },
  "peerDependencies": {
    "@skitsaas/sdk": "^1.3.5",
    "next": "*",
    "react": "*",
    "react-dom": "*"
  }
}
```

## src/manifest.ts skeleton

```ts
import { defineModule } from '@skitsaas/sdk';

export default defineModule({
  moduleId: 'mod.<id>',
  version: '0.1.0',
  displayName: 'Module Name',

  adminNavItems: [],
  dashboardNavItems: [],

  adminRouteAliases: {},
  dashboardRouteAliases: {},

  eventHandlers: [],

  adminPageHandler: undefined,
  dashboardPageHandler: undefined,
  apiHandler: undefined,
});
```

## Build Pipeline

Run in order after any source change:

```bash
pnpm modules:build       # compiles dist/manifest.js via buildCommand
pnpm modules:prepare     # validates sdkRange + generates external.generated.ts
pnpm modules:i18n        # merges module i18n into host bundles
pnpm modules:migrate     # runs module DB migrations
pnpm modules:sync        # upserts app_modules rows
```

For a single module during development:
```bash
pnpm modules:build --module=mod.<id>
pnpm modules:migrate --module=mod.<id>
```

## Boundary Check (Run Before Every Commit)

```bash
rg -n "from '@/|from \"@/" modules/<moduleId>
rg -n "@/app|@/lib|@/components|@/config" modules/<moduleId>
pnpm exec tsc --noEmit
```

Acceptance: first two return 0 matches, typecheck passes.

## SDK Gap Escalation

If a required capability is missing from the SDK:

1. Stop module work.
2. Add entry in `docs/reference/05-sdk-changelog.md` (use existing format).
3. Escalate to `core-sdk-evolution` skill.
4. Implement SDK extension first (separate commit).
5. Return to module work consuming the new SDK contract.

## Module README

Every module must have `modules/<moduleId>/README.md` documenting:
- Purpose and routes
- Config keys used (`app_configs` namespace: `module.<moduleId>.*`)
- DB tables owned
- i18n areas
- SDK gaps tracked
