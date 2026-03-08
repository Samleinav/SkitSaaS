# mod.example.package

Complete source-package example module.

## Scope

This module demonstrates:

- `moduleMode: source-package` with own `package.json`
- own build command (`pnpm build`) that emits `dist/*`
- shared SDK build helper (`@skitsaas/sdk/build`) to transpile `.ts/.tsx/.jsx` and copy assets
- module-local test command (`pnpm test:module`) with SDK contract helper (`@skitsaas/sdk/testing`)
- admin/dashboard module pages and widgets
- API handler with read/write routes
- module-owned DB tables and migrations
- module actions using SDK server adapters
- module-owned JS and CSS UI primitives (`src/ui/*`)
- SDK-first datatables from `@skitsaas/sdk` in both admin and dashboard pages
- remote search/pagination via module API plus request actions with built-in confirm flows

## Module metadata

- `moduleId`: `mod.example.package`
- `moduleMode`: `source-package`
- runtime entry: `dist/manifest.js` (declared in `module.json`)

## Routes and endpoints

- Admin alias: `/admin/custom/example-package`
- Dashboard alias: `/dashboard/custom/example-package`
- API base: `/api/modules/mod.example.package/*`

## Runtime config and env

- No dedicated env matrix is required for this example module.
- Runtime options are resolved from module config and defaults in module source.

## Database and migrations

- Module-owned schema and migrations live under `modules/mod.example.package/db/*`.
- Apply with module migration pipeline (`pnpm modules:migrate`).

## Templates and CTC ids

- This example can expose module UI through module pages/widgets and optional template pack artifacts if configured.
- No locked template ID matrix is required in this baseline example.

## Tests and validation

## Build and prepare

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

## Troubleshooting

- Runtime consumes `dist/manifest.js` (no fallback to source for this mode).
- If module fails to load, run `pnpm modules:build -- --module=mod.example.package` and verify generated `dist/*` files exist.
- Build script can compile `.ts/.tsx` sources from `src/` into `dist/`.
