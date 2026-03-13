# mod.example.package

Complete `source-package` example module with modern SDK form + table patterns.

## Scope

This module demonstrates:

- `moduleMode: source-package` with its own `package.json`
- own build command (`pnpm build`) that emits `dist/*`
- shared SDK build helper (`@skitsaas/sdk/build`)
- module-local test command (`pnpm test:module`)
- admin/dashboard module pages and widgets
- module-owned DB tables and migrations
- SDK-first server actions and `TemplateBuildForm`
- SDK datatables in both remote and local modes
- module-owned visual shell/CSS from inside the package

## Module metadata

- `moduleId`: `mod.example.package`
- `moduleMode`: `source-package`
- runtime entry: `dist/manifest.js`
- `sdkRange`: `^1.7.1`

## Routes and endpoints

- Admin alias: `/admin/custom/example-package`
- Dashboard alias: `/dashboard/custom/example-package`
- API base: `/api/modules/mod.example.package/*`

## Runtime behavior

- Admin home:
  - remote `DataTable` using `source.url`
- Admin create:
  - SDK `TemplateBuildForm`
  - local companion `DataTable`
- Admin edit/settings:
  - SDK `TemplateBuildForm`
  - confirm-backed delete form
- Dashboard create:
  - SDK `TemplateBuildForm`
- Dashboard home:
  - remote `DataTable`

## Database and migrations

- Module-owned schema and migrations live under `modules/mod.example.package/db/*`.
- Apply with module migration pipeline (`pnpm modules:migrate`).

## Templates and CTC

- Manifest still declares template defaults/overrides for `ui.table` and `ui.async-submit-button`.
- Form rendering now comes from SDK `TemplateBuildForm`; no host `@/components/*` imports are required.

## Build and validation

From project root:

```bash
pnpm modules:build -- --module=mod.example.package
pnpm modules:prepare
```

From module root:

```bash
pnpm build
pnpm test:module
```

## Notes

- This is the canonical `source-package` example in the repo.
- It now shows both remote and local SDK tables plus SDK FormBuilder, so it can be used as the baseline for portable module authoring.
