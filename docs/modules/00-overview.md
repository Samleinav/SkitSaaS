---
title: Module Runtime Overview
sidebar_position: 0
description: Host-side overview of the module runtime, registry, dispatch, and lifecycle.
---

# Module Runtime Overview

This section documents the host module runtime only. Documentation for concrete modules does not belong in `docs/` and must live next to the module itself.

This repository ships a **module runtime** that lets you add admin/dashboard pages, API endpoints, nav entries, and widgets without changing the core routes. The runtime is **manifest driven** (code) and **state driven** (DB).

Current authoring reality in this repository:

- many existing modules still run as `source-host`
- shared capabilities should still be consumed from `@skitsaas/sdk` first
- any direct host import in module code should be treated as migration debt

Target architecture:

- move modules toward `source-package` portability over time
- keep host imports only as temporary escape hatches while an SDK gap is being closed

Core components:

- Manifest contract: `lib/modules/manifest.ts`
- Registry (static list): `lib/modules/registry.ts`
- External registry (generated): `lib/modules/external.generated.ts`
- Runtime dispatcher: `lib/modules/runtime.ts`
- App runtime config: `app.config.ts` + `lib/runtime-config/*`
- Events/hooks: `lib/events/*`
- Module i18n registry: `lib/i18n/messages/modules.generated.ts`
- Admin dispatcher route: `app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx`
- Dashboard dispatcher route: `app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx`
- Admin alias resolver route: `app/(dashboard)/admin/[...moduleAlias]/page.tsx`
- Dashboard alias resolver route: `app/(dashboard)/dashboard/[...moduleAlias]/page.tsx`
- API dispatcher route: `app/api/modules/[moduleId]/[[...slug]]/route.ts`
- Runtime state table: `app_modules`

Feature flags (default `true`, set `false` to disable):

- `FF_USE_APP_MODULES_RUNTIME`
- `FF_USE_MODULE_DISPATCHER_ROUTES`

Runtime state rules:

- The registry defines which modules exist.
- Runtime mode controls how enabled modules are resolved:
  - `db`: enabled state from `app_modules` table.
  - `config`: enabled state from `app.config.ts` `modules` map (plus env overrides).
  - `hybrid`: DB baseline + config/env overrides.
- A module is only visible in nav/routes when it is in registry and resolved as enabled by the active runtime mode.

Module mode rules (`module.json` -> `moduleMode`):

- `prebuilt`: host imports compiled `entry`.
- `source-host`: host imports/transpiles module source (`sourceEntry`). This is the current operational default for many legacy modules while they migrate toward SDK-only portability.
- `source-package`: host requires compiled `entry`; no runtime fallback to source. This is the long-term portable target for modules that should stop depending on host internals.
- optional `templatePack` metadata in `module.json` allows build/prepare validation of template artifacts (`defaultEntry`/`overrideEntry`).

Build/prepare pipeline:

```bash
pnpm modules:build
pnpm modules:prepare
pnpm modules:i18n
pnpm modules:migrate
pnpm modules:sync
```

Authoring reference:

- `docs/sdk/01-sdk-first-migration.md` for the migration path from `source-host` convenience to `source-package` portability.
- `docs/modules/13-source-package-template.md` for the advanced `source-package` starter template and checklist.
- `docs/themes/03-template-controller.md` for component template precedence and CTC contract.

Tables related to modules and themes:

- `app_modules`
- `app_configs`
- `app_themes` (legacy for compatibility/audit)
- `user_theme_preferences` (legacy for compatibility/audit)

Events/hooks integration:

- Modules can register `eventHandlers` in `ModuleManifest`.
- Handlers are filtered by hook and executed in priority order.
- See `docs/hooks/01-events-hooks.md` for usage details.

What is in scope:

- Add pages and APIs through the dispatcher routes.
- Add nav items and widgets for admin/dashboard.
- Use module owned tables with a shared DB migration system.

What is out of scope:

- Dynamic plugin loading at runtime (registry is static).
- Per-module permissions built in (you must enforce in handlers).
