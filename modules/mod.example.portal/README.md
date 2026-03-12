# mod.example.portal

Example module demonstrating the **portal system** in SKSS. Shows how a module can register
a named portal served at a custom URL prefix (`/hub/*`) with its own layout, public and
authenticated pages, optional theme injection, and portal-scoped API routes.

Portals are completely independent from the marketing frontend — the middleware rewrites
portal requests to an internal dispatcher that does not inherit `(frontend)/layout.tsx`.

## What this demonstrates

| Feature | File |
|---|---|
| `RoutePortal` factory + `.name()` | `src/routes.ts` |
| `RouteApiPortal` scoped API builder | `src/routes.ts` |
| `.page()` + `.register()` (Node.js context) | `src/portal-init.ts` |
| `isDefaultPortal: true` (post-login redirect) | `src/portal-init.ts` |
| `module.json` auto-registration fields | `module.json` |
| Portal layout with `PortalLayoutProps` | `portal/hub/layout.tsx` |
| Public page (no auth) | `portal/hub/home/page.tsx` |
| Auth-required page | `portal/hub/members/page.tsx` |
| Dynamic route `{id}` + auth | `portal/hub/members/[id]/page.tsx` |

## URL structure

```
/hub                  → home (public)
/hub/members          → member list (auth required)
/hub/members/{id}     → member detail (auth required + dynamic param)
/api/hub/members      → API: list members (auth required)
/api/hub/members/{id} → API: member detail (auth required)
```

## How to enable

```bash
pnpm modules:prepare
pnpm dev
```

That's it. The `module.json` fields `routesEntry` and `portalInit` are read by `modules:prepare`,
which auto-generates the bootstrap imports in:
- `lib/routing/all-routes.generated.ts` — middleware proxy chain (edge)
- `lib/portals/all-portals.generated.ts` — page registry (Node.js)

Navigate to `http://localhost:3000/hub`.

## Post-login redirect

`isDefaultPortal: true` is set in `src/portal-init.ts`, so all authenticated non-admin users
are redirected to `/hub` after login. To restrict to a specific role instead, replace it with:

```ts
HubRoute.register({
  ...
  redirectRoles: ['member'],  // only users with role 'member' → /hub after login
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

## File structure

```
mod.example.portal/
  module.json               ← routesEntry + portalInit for auto-registration
  src/
    constants.ts            ← module ID + portal name ('hub')
    routes.ts               ← EDGE: RoutePortal + RouteApiPortal + .name()
    portal-init.ts          ← NODE.JS: .page() + .register()
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
