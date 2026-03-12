# mod.example.portal

Example module demonstrating the **portal system** in SKSS. Shows how a module can register
a named portal served at a custom URL prefix (`/hub/*`) with public and authenticated pages,
a custom layout, and portal-scoped API routes.

## What this demonstrates

| Feature | File |
|---|---|
| `RoutePortal` factory + `.name()` | `src/routes.ts` |
| `RouteApiPortal` scoped API builder | `src/routes.ts` |
| `.page()` + `.register()` (Node.js context) | `src/portal-init.ts` |
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

### 1. Register module (generate registry)
```bash
pnpm modules:prepare
```

### 2. Enable middleware proxy enforcement
In `lib/routing/all-routes.ts`, uncomment:
```ts
import '@/../modules/mod.example.portal/src/routes';
```

### 3. Enable portal page dispatcher
In `lib/portals/all-portals.ts`, uncomment:
```ts
import '@/../modules/mod.example.portal/src/portal-init';
```

### 4. Run dev
```bash
pnpm dev
```

Navigate to `http://localhost:3000/hub`.

## Role-based redirect (optional)

To redirect users with a specific role directly to this portal after login,
uncomment the `redirectRoles` line in `src/portal-init.ts`:

```ts
HubRoute.register({
  ...
  redirectRoles: ['member'],  // users with role 'member' → /hub after login
});
```

## File structure

```
mod.example.portal/
  module.json               ← module declaration
  src/
    constants.ts            ← module ID + portal name
    routes.ts               ← edge-safe: RoutePortal + RouteApiPortal + .name()
    portal-init.ts          ← Node.js: .page() + .register()
    manifest.ts             ← defineModule()
  portal/
    hub/
      layout.tsx            ← portal layout (PortalLayoutProps)
      home/
        page.tsx            ← /hub (public)
      members/
        page.tsx            ← /hub/members (auth)
        [id]/
          page.tsx          ← /hub/members/{id} (auth + dynamic)
```
