---
title: Modules Overview
sidebar_position: 0
---

# Modules Overview

This repository ships a **module runtime** that lets you add admin/dashboard pages, API endpoints, nav entries, and widgets without changing the core routes. The runtime is **manifest driven** (code) and **state driven** (DB).

Core components:

- Manifest contract: `lib/modules/manifest.ts`
- Registry (static list): `lib/modules/registry.ts`
- External registry (generated): `lib/modules/external.generated.ts`
- Runtime dispatcher: `lib/modules/runtime.ts`
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
- The DB defines which modules are enabled.
- A module is only visible in nav/routes when **both** registry and DB say it is enabled.

Module mode rules (`module.json` -> `moduleMode`):

- `prebuilt`: host imports compiled `entry`.
- `source-host`: host imports/transpiles module source (`sourceEntry`).
- `source-package`: host requires compiled `entry`; no runtime fallback to source.
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

- `docs/modules/13-source-package-template.md` for `source-package` starter template and checklist.
- `docs/modules/14-template-controller.md` for component template precedence and CTC contract.

Tables related to modules and themes:

- `app_modules`
- `app_configs`
- `app_themes` (legacy for compatibility/audit)
- `user_theme_preferences` (legacy for compatibility/audit)

Events/hooks integration:

- Modules can register `eventHandlers` in `ModuleManifest`.
- Handlers are filtered by hook and executed in priority order.
- See `docs/events-hooks.md` for usage details.

What is in scope:

- Add pages and APIs through the dispatcher routes.
- Add nav items and widgets for admin/dashboard.
- Use module owned tables with a shared DB migration system.

What is out of scope:

- Dynamic plugin loading at runtime (registry is static).
- Per-module permissions built in (you must enforce in handlers).
