# mod.example.suite

Comprehensive reference module for the host runtime.

This module demonstrates, in a single module:

- admin routes with subpages (`home`, `create`, `edit/:id`, `settings`)
- dashboard routes with subpages (`home`, `create`, `items/:id`)
- API routes with auth/role checks
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
- `/admin/custom/example-suite/edit/:id`
- `/admin/custom/example-suite/settings`

### Dashboard aliases

- `/dashboard/custom/example-suite`
- `/dashboard/custom/example-suite/create`
- `/dashboard/custom/example-suite/items/:id`

### API routes

Base:

- `/api/modules/mod.example.suite`

Implemented endpoints:

- `GET /api/modules/mod.example.suite/health`
- `GET /api/modules/mod.example.suite/items`
- `GET /api/modules/mod.example.suite/items?scope=admin` (admin only view)
- `POST /api/modules/mod.example.suite/items`
- `PATCH /api/modules/mod.example.suite/items/:id`

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

## Registering and enabling

1. Make sure the module folder exists under `modules/mod.example.suite`.
2. Run:
   - `pnpm modules:build`
   - `pnpm modules:prepare`
   - `pnpm modules:i18n` (safe even if no module i18n files)
3. Run DB migrations:
   - `pnpm modules:migrate`
   - if this is a fresh environment, run core migrations too: `pnpm db:migrate`
4. Sync runtime state:
   - `pnpm modules:sync`
5. Start app:
   - `pnpm dev`

Once synced, module status is tracked in `app_modules`.
