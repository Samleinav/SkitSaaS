# Topology and boundaries

## Source of truth order

When examples, docs, and older skills disagree, trust them in this order:

1. SDK types in `app/sdk/src/*`
2. `docs/sdk/00-overview.md`
3. `docs/modules/*`
4. example modules
5. older skill snippets

Example: `adminRouteAliases`, `dashboardRouteAliases`, and
`frontendRouteAliases` are `string[]` in `app/sdk/src/modules/manifest.ts`.
Do not reintroduce object-map aliases from older examples.

## SDK-first import rules

Default imports by concern:

- client-safe contracts, routes, forms, tables: `@skitsaas/sdk`
- auth, DB, actions, server routers, revalidation: `@skitsaas/sdk/server`
- Drizzle helpers: `@skitsaas/sdk/db`
- module build scripts: `@skitsaas/sdk/build`
- module test helpers: `@skitsaas/sdk/testing`

Avoid in reusable modules:

- `@/app/*`
- `@/lib/*`
- `@/components/*`
- `@/config/*`
- host `adminAction` / `dashboardAction`
- host rate-limit helpers from `@/lib/routing/rate-limit`
- host DB clients or schema imports

Exception policy:

- `source-host` may reuse host UI only when the request is explicitly local-app-only
  or the SDK does not expose the required surface.
- If the exception should become reusable across modules, stop and switch to
  `core-sdk-evolution` instead of normalizing the host import.

## Pick the right route topology

| Need | Use | Main files | Do not do this |
|---|---|---|---|
| Admin/dashboard/frontend module page inside the normal app chrome | `adminPage`, `dashboardPage`, or `frontendPage` in `manifest.ts`, usually via `createModulePageRouter(...)` | `modules/<moduleId>/src/manifest.ts`, optional `src/routes.ts` for named links | Do not create `app/(dashboard)` or `app/(frontend)` pages for module screens. |
| Friendly admin/dashboard/frontend URL | Alias arrays in manifest and nav hrefs pointing to the alias | `src/manifest.ts` | Do not hardcode dispatcher URLs into nav when an alias exists. |
| Named route helpers and proxy-aware route strings | `RouteAdmin`, `RouteDashboard`, `RouteFrontend`, or `RouteApi` in module `src/routes.ts` | `src/routes.ts` | Do not invent plain string constants when route builders are already the right fit. |
| Module API under `/api/modules/<moduleId>/*` | Prefer `RouteApi(...).METHOD()` in `src/routes.ts` plus `apiRoutes` in `manifest.ts`. Use `createModuleApiRouter` only for migrations or legacy modules. | `src/routes.ts`, `src/manifest.ts` | Do not create manual `app/api/modules/<moduleId>/*` handlers. |
| Standalone or dashboard portal page set | `RoutePortal(...)` in `src/routes.ts` plus `.page()` and `.register()` in `src/portal-init.ts` | `src/routes.ts`, `src/portal-init.ts`, `portal/<portalName>/*`, `module.json` (`routesEntry`, `portalInit`) | Do not place portal screens under `app/(frontend)` or call `.page()` from `routes.ts`. |
| Portal API under `/api/<portalName>/*` | `RouteApiPortal(...)` in `src/routes.ts` plus host route handlers under `app/api/<portalName>/*/route.ts` using `.nextHandler` | `src/routes.ts`, `app/api/<portalName>/*/route.ts` | Do not force portal APIs through `/api/modules/*` when the actual requirement is a portal-scoped endpoint. |
| Embeddable frontend content | `frontendSlots` in the manifest | `src/manifest.ts` | Do not couple a theme directly to module imports when a slot is enough. |

## Routes, proxies, and rate limits

- `source-host` route files may keep `import '@/lib/routing/area-setup'` as
  the first line when they need host-configured `.auth()` / proxy defaults.
- `source-package` route files must stay SDK-only and rely on the host
  bootstrap to configure area defaults and API auth proxies before loading the
  generated module routes.
- `.name(...)` registers the route. Without it, the named route registry and
  portal proxy chain cannot see the route.
- `.auth()` and `.proxy([...])` set access control for route builders.
- Prefer one base alias and let `slug` handle nested create/edit/detail paths.
- For typed module APIs, prefer `.rateLimit(...)` on the `RouteApi` builder.
- For manual API composition, use `withRateLimit` from `@skitsaas/sdk`.
- Never import rate limiting from `@/lib/routing/rate-limit` in module code.

## Forms and actions

Use the BuildForm contract for stable CRUD, settings, and confirm flows:

- define forms with `defineBuildForm`, `buildFormField`,
  `withBuildFormValidation`, and `composeBuildFormDefinition`
- validate mutations with `createValidatedServerActionController`
- use `buildFormRule`, `dbRef`, and `fieldRef` for reusable validation rules

File split that usually works well:

- `src/forms.ts`
- `src/actions.ts`
- `src/pages/*` or `portal/<portalName>/*`
- optional module-local UI wrappers

Avoid:

- raw HTML CRUD forms as the default implementation
- host `adminAction` / `dashboardAction`
- host form registry or validation runtime imports

Renderer rule:

- `source-package`: keep the form contract SDK-first; do not pull in host form
  renderers unless the module is intentionally not portable.
- `source-host`: host UI renderers can be used deliberately, but the form
  definition and server validation should still be SDK-first.

## Canonical examples

Use these as the first local examples to inspect:

- `modules/mod.example.package/src/manifest.js`
  - boundary-safe source-package baseline
- `modules/mod.example.api/src/routes.ts`
  - typed module API route metadata
- `modules/mod.example.api/src/manifest.ts`
  - `apiRoutes` attachment in manifest
- `modules/mod.example.portal/src/routes.ts`
  - portal route and portal API metadata
- `modules/mod.example.portal/src/portal-init.ts`
  - portal page registration and redirect metadata
- `modules/mod.example.suite/src/routes.ts`
  - named admin/dashboard route builders

Treat `source-host` examples with host imports as topology references only,
not as reusable boundary templates.
