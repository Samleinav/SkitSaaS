# mod.example.dashboard

Source-host example module that now acts as the lightweight SDK showcase for dashboard + frontend aliases.

## What it demonstrates

- `dashboardRouteAliases` and `dashboardNavItems`
- `frontendRouteAliases` and `frontendPage`
- `frontendSlots` with module-owned styling
- SDK `TemplateBuildForm` on the dashboard page
- SDK `DataTable` in both local and remote modes
- typed `apiRoutes` backing a `source.url` table on the frontend page
- typed route metadata kept in `src/routes.ts`, with handlers attached later in
  `src/manifest.ts`

## Module metadata

- `moduleId`: `mod.example.dashboard`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `sdkRange`: `^1.7.1`

## Routes

- Dashboard alias route:
  - `/dashboard/custom/example-dashboard`
- Frontend alias route:
  - `/features/example-dashboard`
- Canonical dispatcher routes:
  - `/dashboard/modules/mod.example.dashboard`
  - `/modules/mod.example.dashboard`
- Module API route:
  - `GET /api/modules/mod.example.dashboard/showcase-playbooks`

## Runtime behavior

- Dashboard page:
  - module-branded shell
  - local `DataTable`
  - validated `TemplateBuildForm`
- Frontend page:
  - remote `DataTable` using `source.url`
  - data served from typed module `apiRoutes`
- Frontend slot:
  - `frontend.contact.form.primary` -> styled module card rendered from the module

## Config and env

- No module-specific runtime config keys.
- No module-specific env variables.

## Database and migrations

- No module-owned DB tables.
- No migrations.

## Tests and validation

Recommended checks from project root:

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
```

## Notes

- This module is the clearest minimal `source.url` example in the repo.
- The dashboard table intentionally stays local so authors can compare both SDK datatable modes in one place.
