# mod.example.suite

Comprehensive `source-host` reference module for the host runtime.

## Scope

This module demonstrates, in a single module:

- admin routes with subpages (`home`, `create`, `edit/:itemId`, `settings`)
- dashboard routes with subpages (`home`, `create`, `items/:itemId`)
- module-owned database tables
- validated server actions for admin and dashboard forms
- remote and local SDK `DataTable` examples in the same module
- module-owned shell/CSS layered on top of the host area
- legacy `apiHandler` shape with richer table query handling and delete endpoint
- module widgets (`adminDashboardWidgets`, `dashboardWidgets`)

## Module id and entry

- `moduleId`: `mod.example.suite`
- `moduleMode`: `source-host`
- entry file: `src/manifest.ts`
- `sdkRange`: `^1.7.1`

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

Pattern used here:

- `src/api-handler.ts` exports one legacy `apiHandler`
- matching, auth checks, and request dispatch live together in that router
- unlike the typed `RouteApi(...).METHOD()` plus `apiRoutes` pattern, this does
  not split metadata registration from handler loading

Implemented endpoints:

- `GET /api/modules/mod.example.suite/health`
- `GET /api/modules/mod.example.suite/items`
- `GET /api/modules/mod.example.suite/items?scope=admin`
- `POST /api/modules/mod.example.suite/items`
- `PATCH /api/modules/mod.example.suite/items/:itemId`
- `DELETE /api/modules/mod.example.suite/items/:itemId`

## UI patterns now covered

- Admin home:
  - remote SDK `DataTable` backed by `source.url`
- Admin create:
  - SDK `TemplateBuildForm`
  - local companion `DataTable`
- Admin edit/settings:
  - SDK `TemplateBuildForm`
- Dashboard home:
  - local SDK `DataTable`
- Dashboard create:
  - SDK `TemplateBuildForm`
- Dashboard detail:
  - module-owned presentation layer without host cards/buttons

## Database objects

Defined in `modules/mod.example.suite/db/schema.ts`:

- `mod_example_suite_items`
- `mod_example_suite_settings`

## Templates and renderer boundary

- `templatePack` still declares defaults/overrides for `ui.table`, `ui.form`, and `ui.async-submit-button`.
- Module pages now import `TemplateBuildForm` from `@skitsaas/sdk`, not from host `@/components/*`.

## Validation

Recommended checks:

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

If you need the full runtime flow:

```bash
pnpm modules:migrate -- --module=mod.example.suite
pnpm dev
```

## Notes

- This is the best in-repo example when you want one module showing both local and remote datatables, admin + dashboard forms, module DB, and module-owned presentation.
