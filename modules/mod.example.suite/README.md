# mod.example.suite

Comprehensive reference module for the host runtime.

## Scope

This module demonstrates, in a single module:

- admin routes with subpages (`home`, `create`, `edit/:itemId`, `settings`)
- dashboard routes with subpages (`home`, `create`, `items/:itemId`)
- API routes wired through `createModuleApiRouter(...)` via `apiHandler`
- module-owned database tables
- server actions for admin and dashboard forms
- module widgets (`adminDashboardWidgets`, `dashboardWidgets`)

## Module id and entry

- `moduleId`: `mod.example.suite`
- `moduleMode`: `source-host`
- entry file: `src/manifest.ts`
- `module.json` points to `sourceEntry: src/manifest.ts`

## Routes

### Admin aliases

- `/admin/custom/example-suite`
- `/admin/custom/example-suite/create`
- `/admin/custom/example-suite/edit/:itemId`
- `/admin/custom/example-suite/settings`

### Dashboard aliases

- `/dashboard/custom/example-suite`
- `/dashboard/custom/example-suite/create`
- `/dashboard/custom/example-suite/items/:itemId`

### API routes

Base:

- `/api/modules/mod.example.suite`

Implemented endpoints:

- `GET /api/modules/mod.example.suite/health`
- `GET /api/modules/mod.example.suite/items`
- `GET /api/modules/mod.example.suite/items?scope=admin` (admin only view)
- `POST /api/modules/mod.example.suite/items`
- `PATCH /api/modules/mod.example.suite/items/:itemId`

This module keeps the larger `source-host` API shape:

- `src/api-handler.ts` defines the route list with `createModuleApiRouter(...)`
- `src/manifest.ts` attaches it as `apiHandler: exampleSuiteApiHandler`
- typed per-route `apiRoutes` are demonstrated instead in `mod.example.api`

## Database objects

Defined in `modules/mod.example.suite/db/schema.ts`:

- `mod_example_suite_items`
- `mod_example_suite_settings`

`mod_example_suite_items` stores module records:

- title, description, status, priority
- visibility (`is_public`)
- owner (`owner_user_id`)

`mod_example_suite_settings` stores runtime options:

- `allow_dashboard_create`
- `api_write_mode` (`authenticated` or `admin`)
- `default_status`

Module DB assets live in `modules/mod.example.suite/db/*` and are migrated with the
module migration pipeline.

## Server actions

Implemented in `src/actions.ts`:

- `createExampleSuiteItemAdminAction`
- `updateExampleSuiteItemAdminAction`
- `deleteExampleSuiteItemAdminAction`
- `updateExampleSuiteSettingsAdminAction`
- `createExampleSuiteItemDashboardAction`

These actions enforce access by:

- `requireAdminUser` for admin mutations
- session user checks for dashboard mutations
- path revalidation for admin and dashboard aliases

## Runtime options in settings page

From `/admin/custom/example-suite/settings`:

- toggle dashboard create capability
- choose API write mode
- choose default status for new records

The API handler and dashboard create flow read these values at runtime.

## Runtime config and env

- Runtime options are persisted in module settings (`mod_example_suite_settings`).
- No dedicated env override matrix is required for this reference module.

## Module i18n contract

This module can ship both module i18n formats:

- nested area messages:
  - `i18n/<area>/<locale>.json`
  - or compiled `dist/i18n/<area>/<locale>.json`
- flat natural-key translations:
  - `i18n/translations/<locale>.json`
  - or compiled `dist/i18n/translations/<locale>.json`

Use nested area files for `messages.mod['mod.example.suite'].*`.
Use flat files for ad-hoc lookups through `createTranslator()` / `useI18n()`.

If the module ever moves to `source-package`, the build output must include the
same files under `dist/i18n/...`, because the host prefers compiled artifacts
when `dist/i18n` exists.

## Templates and CTC ids

Current template pack entries:

- `ui.table` -> `mod.example.suite.default.table`
- `ui.form` -> `mod.example.suite.default.form`
- `ui.async-submit-button` -> `mod.example.suite.override.async-submit`

Current structured form usage:

- admin create page uses host `TemplateBuildForm`
- admin edit page uses host `TemplateBuildForm` with prefills
- admin settings page uses host `TemplateBuildForm` sections for grouped settings
- delete flow uses confirm submit through the same form system

Because this module is a `source-host` example, those pages currently import
`TemplateBuildForm` from `@/components/ui/template-build-form`.

Recommended rollout order for module forms:

1. create flow
2. edit flow with prefills
3. grouped settings flow
4. delete/confirm flow

SDK vs host ownership:

- module form definitions, field rules, and validated actions stay in module code
- reusable form contracts must come from `@skitsaas/sdk` and `@skitsaas/sdk/server`
- host-only controller registration, DB resolver registration, and system activity logging stay in core runtime
- if a module introduces a new `dbRef(...)` target, the host must add the resolver before enabling that form in production

## Tests and validation

- Run module build/prepare flow and validate alias/API routes.
- Recommended checks:
  - `pnpm modules:build -- --module=mod.example.suite`
  - `pnpm modules:prepare`
  - `pnpm check`

## Registering and enabling

1. Make sure the module folder exists under `modules/mod.example.suite`.
2. Run:
   - `pnpm modules:build`
   - `pnpm modules:prepare`
   - `pnpm modules:i18n` (safe even if no module i18n files)
   - `pnpm i18n:prepare` (required for flat translation files)
3. Run DB migrations:
   - `pnpm modules:migrate`
   - if this is a fresh environment, run core migrations too: `pnpm db:migrate`
4. Sync runtime state:
   - `pnpm modules:sync`
5. Start app:
   - `pnpm dev`

Once synced, module status is tracked in `app_modules`.

## Troubleshooting

- Alias route not resolving: run `pnpm modules:prepare` and verify module is enabled in runtime registry.
- Settings changes not reflected: confirm module sync/migration status and persisted settings rows.
- API writes blocked: check `api_write_mode` and current user role/session.
