# mod.example.portal

Example module demonstrating the portal system in SKSS. It shows how a module can
register a named portal served at `/hub/*` with its own layout, public and
authenticated pages, CSS loading control, and portal API metadata.

Portals are completely independent from the marketing frontend. The middleware
rewrites portal requests to an internal dispatcher that does not inherit
`app/(frontend)/layout.tsx`.

## Scope

| Feature | File |
|---|---|
| `RoutePortal` factory + `.name()` | `src/routes.ts` |
| `RouteApiPortal` scoped API metadata | `src/routes.ts` |
| `.page()` + `.register()` (Node.js context) | `src/portal-init.ts` |
| `redirectRoles: ['hubrole']` (post-login redirect) | `src/portal-init.ts` |
| `coreCss` option (core CSS loading control) | `src/portal-init.ts` |
| `module.json` auto-registration fields | `module.json` |
| Portal layout with `PortalLayoutProps` | `portal/hub/layout.tsx` |
| Public page (no auth) | `portal/hub/home/page.tsx` |
| Public registration page with SDK form/table | `portal/hub/register/page.tsx` |
| Auth-required page | `portal/hub/members/page.tsx` |
| Dynamic route `{id}` + auth | `portal/hub/members/[id]/page.tsx` |

## Module metadata

- `moduleId`: `mod.example.portal`
- `moduleMode`: `source-host`
- `sourceEntry`: `src/manifest.ts`
- `routesEntry`: `src/routes.ts`
- `portalInit`: `src/portal-init.ts`
- `sdkRange`: `^1.5.0`

## Routes and API metadata

Implemented portal pages:

```text
/hub
/hub/register
/hub/members
/hub/members/{id}
```

Declared portal API metadata:

- `GET /api/hub/members`
- `GET /api/hub/members/{id}`

This example does not ship host bridge files under `app/api/hub/*`, so those
portal API endpoints are not active by default. To activate them, add host
bridge files that wrap `HubApiRoutes.*.handler(...)` with
`withApiRouteEntries(...)` as documented in `docs/portals/01-portal-system.md`.

## Config and env

- No module-specific env matrix is required for this example.
- Runtime behavior is driven by the portal metadata declared in `src/portal-init.ts`.

## Tests and validation

```bash
pnpm modules:prepare
pnpm dev
```

The `module.json` fields `routesEntry` and `portalInit` are read by
`modules:prepare`, which auto-generates the bootstrap imports in:

- `lib/routing/all-routes.generated.ts` for the middleware proxy chain
- `lib/portals/all-portals.generated.ts` for the page registry

Navigate to `http://localhost:3000/hub`.

## CSS loading

By default portals load the frontend core CSS bundle (globals + Tailwind CSS variables).
Control this with the `coreCss` option in `.register()`:

```ts
HubRoute.register({
  layout: ...,
  userTheme: false,

  // coreCss: true        -> default: loads /.generated/core-assets/frontend/core-*.css
  // coreCss: 'dashboard' -> loads the dashboard core CSS instead
  // coreCss: false       -> no core CSS, bring your own via head.css

  // head: {
  //   css: ['/my-portal.css'],
  //   js: ['/my-portal.js'],
  // },
});
```

When `userTheme` is set to a theme ID string, CSS is managed entirely by the
theme system (`resolveAreaAssetHrefsBySelection`) and `coreCss` / `head` are ignored.

## Post-login redirect

`redirectRoles: ['hubrole']` is set in `src/portal-init.ts`, so users with role
`hubrole` are redirected to `/hub` after login. To make the portal the global
fallback for all authenticated non-admin users instead, replace it with:

```ts
HubRoute.register({
  ...
  isDefaultPortal: true,
});
```

## How the middleware rewrite works

```text
GET /hub/members
  -> proxy.ts detects 'hub' in portalPrefixSet
  -> runs proxy chain (auth enforcement may redirect to login)
  -> NextResponse.rewrite('/portal-internal/hub/members')
  -> app/(portal)/portal-internal/[...slug]/page.tsx
  -> resolvePortalPage({ portalName: 'hub', slug: ['members'] })
  -> HubLayout wraps HubMembersPage
```

Direct access to `/portal-internal/*` returns 404. Portal pages are served
under `app/(portal)/`, which does not inherit the `(frontend)` marketing layout.

## Templates and CTC

- This example does not declare a module `templatePack`.
- It demonstrates portable SDK UI inside a portal page (`DataTable` and `TemplateBuildForm`).

## Database and migrations

- No module-owned DB tables.
- No module migrations.

## File structure

```text
mod.example.portal/
  module.json
  src/
    constants.ts
    routes.ts
    portal-init.ts
    manifest.ts
  portal/
    hub/
      layout.tsx
      home/page.tsx
      register/page.tsx
      members/page.tsx
      members/[id]/page.tsx
```

## Two-file split: edge vs Node.js

| File | Context | Purpose |
|---|---|---|
| `src/routes.ts` | Edge (middleware) | Registers proxy chains and portal API metadata |
| `src/portal-init.ts` | Node.js (server) | Registers page components via `.page()` and portal metadata via `.register()` |

Never import `portal-init.ts` from edge files. Never call `.page()` or `.register()` from `routes.ts`.

## Troubleshooting

- If `/hub/*` does not resolve, run `pnpm modules:prepare` and confirm `module.json` still declares both `routesEntry` and `portalInit`.
- If a protected page becomes public, verify every `.page()` path in `src/portal-init.ts` still has a matching named route in `src/routes.ts`.
- If `/api/hub/*` is expected to work, confirm the host bridge files under `app/api/hub/*` exist and use `withApiRouteEntries(...)`.
- If the post-login redirect changes unexpectedly, verify `redirectRoles` or `isDefaultPortal` in `src/portal-init.ts`.
