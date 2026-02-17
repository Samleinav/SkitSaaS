# mod.example.package

Complete source-package example module.

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

## Module routes

- Admin: `/admin/custom/example-package`
- Dashboard: `/dashboard/custom/example-package`
- API: `/api/modules/mod.example.package/*`

## Notes

- Runtime consumes `dist/manifest.js` (no fallback to source for this mode).
- Build script can compile `.ts/.tsx` sources from `src/` into `dist/`.
