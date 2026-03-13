# mod.example.portal

Example module demonstrating the **portal system** in SKSS. Shows how a module can register
a named portal served at a custom URL prefix (`/hub/*`) with its own layout, public and
authenticated pages, CSS loading control, and portal-scoped API routes.

Portals are completely independent from the marketing frontend — the middleware rewrites
portal requests to an internal dispatcher that does not inherit `(frontend)/layout.tsx`.

## Scope

| Feature | File |
|---|---|
| `RoutePortal` factory + `.name()` | `src/routes.ts` |
| `RouteApiPortal` scoped API builder | `src/routes.ts` |
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

## Routes and endpoints

```
/hub                  → home (public)
/hub/register         → registration (public)
/hub/members          → member list (auth required)
/hub/members/{id}     → member detail (auth required + dynamic param)
/api/hub/members      → API: list members (auth required)
/api/hub/members/{id} → API: member detail (auth required)
```

## Config and env

- No module-specific env matrix is required for this example.
- Runtime behavior is driven by the portal metadata declared in `src/portal-init.ts`.

## Tests and validation

```bash
pnpm modules:prepare
pnpm dev
```

That's it. The `module.json` fields `routesEntry` and `portalInit` are read by `modules:prepare`,
which auto-generates the bootstrap imports in:
- `lib/routing/all-routes.generated.ts` — middleware proxy chain (edge)
- `lib/portals/all-portals.generated.ts` — page registry (Node.js)

Navigate to `http://localhost:3000/hub`.

## CSS loading

By default portals load the **frontend core CSS bundle** (globals + Tailwind CSS variables).
Control this with the `coreCss` option in `.register()`:

```ts
HubRoute.register({
  layout: ...,
  userTheme: false,

  // coreCss: true           → default: loads /.generated/core-assets/frontend/core-*.css
  // coreCss: 'dashboard'    → loads the dashboard core CSS instead
  // coreCss: false          → no core CSS — bring your own via head.css

  // head: {
  //   css: ['/my-portal.css'],  // extra CSS URLs, loaded after core
  //   js:  ['/my-portal.js'],   // extra JS URLs
  // },
});
```

When `userTheme` is set to a theme ID string, CSS is managed entirely by the theme system
(`resolveAreaAssetHrefsBySelection`) and `coreCss` / `head` are ignored.

## Post-login redirect

`redirectRoles: ['hubrole']` is set in `src/portal-init.ts`, so users with role `hubrole`
are redirected to `/hub` after login. To make the portal the global fallback for all
authenticated non-admin users instead, replace it with:

```ts
HubRoute.register({
  ...
  isDefaultPortal: true,
});
```

## How the middleware rewrite works

```
GET /hub/members
  → proxy.ts detects 'hub' in portalPrefixSet
  → runs proxy chain (auth enforcement — may redirect to login)
  → NextResponse.rewrite('/portal-internal/hub/members')
  → app/(portal)/portal-internal/[...slug]/page.tsx
  → resolvePortalPage({ portalName: 'hub', slug: ['members'] })
  → HubLayout wraps HubMembersPage
```

Direct access to `/portal-internal/*` returns 404. The portal pages are served under `app/(portal)/`,
which does NOT inherit the `(frontend)` marketing layout.

## Templates and CTC

- This example does not declare a module `templatePack`.
- It demonstrates portable SDK UI inside a portal page (`DataTable` and `TemplateBuildForm`).

## Database and migrations

- No module-owned DB tables.
- No module migrations.

## File structure

```
mod.example.portal/
  module.json               ← routesEntry + portalInit for auto-registration
  src/
    constants.ts            ← module ID + portal name ('hub')
    routes.ts               ← EDGE: RoutePortal + RouteApiPortal + .name()
    portal-init.ts          ← NODE.JS: .page() + .register()
    forms.ts                ← shared form definition for /hub/register
    manifest.ts             ← defineModule()
  portal/
    hub/
      layout.tsx            ← portal layout (PortalLayoutProps)
      home/
        page.tsx            ← /hub (public)
      members/
        page.tsx            ← /hub/members (auth)
        [id]/
          page.tsx          ← /hub/members/{id} (auth + dynamic param)
```

## Two-file split: edge vs Node.js

| File | Context | Purpose |
|---|---|---|
| `src/routes.ts` | Edge (middleware) | Registers proxy chains via `.name()` |
| `src/portal-init.ts` | Node.js (server) | Registers page components via `.page()` and portal metadata via `.register()` |

Never import `portal-init.ts` from edge files. Never call `.page()` or `.register()` from `routes.ts`.

## Troubleshooting

- If `/hub/*` does not resolve, run `pnpm modules:prepare` and confirm `module.json` still declares both `routesEntry` and `portalInit`.
- If a protected page becomes public, verify every `.page()` path in `src/portal-init.ts` still has a matching named route in `src/routes.ts`.
- If the post-login redirect changes unexpectedly, verify `redirectRoles` or `isDefaultPortal` in `src/portal-init.ts`.
