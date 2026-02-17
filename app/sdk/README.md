# Module SDK

This package defines the **public SDK contract** for external modules.

## Structure

- `src/index.ts`: types + constants (stable contract).
- `src/db.ts`: curated Drizzle re-exports (`@skitsaas/sdk/db`).
- `src/server.ts`: optional server helpers (auth/session, revalidation, event
  emit, module config, database adapter with string table lookup, declarative
  module API/page routers, action controller, parse helpers).
- `src/datatables/*`: datatable template contracts + declarative CRUD API router
  helper (`createDataTableCrudApiRouter`).
- `src/i18n/types.ts`: module i18n types and namespacing.

## Build

```
pnpm build
```

Output goes to `dist/`.

## Versioning Policy

- Semver applies to the SDK API exposed to modules.
- `MAJOR`: breaking module-facing changes.
- `MINOR`: backwards-compatible additions.
- `PATCH`: backwards-compatible fixes.
- Modules should declare a compatible `sdkRange` in `module.json`.

## I18n namespacing

Module translations should live under the `mod.<moduleId>.*` namespace.
Use `ModuleMessagesByArea` to type module bundles.

## Custom module routes

The SDK manifest supports friendly route aliases:

- `adminRouteAliases` for `/admin/*`
- `dashboardRouteAliases` for `/dashboard/*`
- `frontendRouteAliases` for frontend paths such as `/contact-us`
- `frontendRouteAccess` to declare frontend auth policy (`public`, `user`, `admin`)
- `frontendSlots` to expose typed frontend slot providers (`slotId` + `handler`)

If `frontendRouteAccess` is not provided, the default is `public`.

Use them together with nav item `href` values when you want readable routes
instead of dispatcher URLs.
