---
title: Portal System
sidebar_position: 1
description: Named portals served at custom URL prefixes with independent layouts, auth, CSS, and role-based access. Architecture, two-file split, CSS loading, role enforcement, and API routes.
---

# Portal System

Status: Production-ready
Last review: 2026-03-12

Portals are named areas served at `/<portalName>/*` (standalone) or `/dashboard/<portalName>/*`
(dashboard area) that are **completely independent** from the marketing frontend and dashboard
chrome. Each portal has its own layout, pages, proxy chain, CSS, and optional theme.
They do not inherit `app/(frontend)/layout.tsx` or `app/(dashboard)/layout.tsx`.

## Portal Areas

Two URL placements are available via the `area` option in `RoutePortal`:

| `area` | URL prefix | Default CSS | Use when |
|---|---|---|---|
| `'standalone'` (default) | `/<name>/*` | frontend core CSS | User-facing portal at root level |
| `'dashboard'` | `/dashboard/<name>/*` | dashboard core CSS | Portal logically part of the authenticated app, grouped under `/dashboard/*` for multi-server routing |

Both options serve the portal with an **independent layout** — no dashboard sidebar, no marketing nav.

## Architecture

**Standalone portal:**
```
Browser: GET /hub/members
  → proxy.ts (middleware)
  → portalPrefixSet.has('hub') → true
  → executeProxyChain([proxyAuth, ...])
  → NextResponse.rewrite('/portal-internal/hub/members')
  → app/(portal)/portal-internal/[...slug]/page.tsx
  → resolvePortalPage({ portalName: 'hub', slug: ['members'] })
  → HubLayout wraps HubMembersPage
```

**Dashboard area portal:**
```
Browser: GET /dashboard/school/students
  → proxy.ts (middleware)
  → dashboardPortalSet.has('school') → true
  → executeProxyChain([proxyAuth, role guard, ...])
  → NextResponse.rewrite('/portal-internal/school/students')
  → app/(portal)/portal-internal/[...slug]/page.tsx
  → resolvePortalPage({ portalName: 'school', slug: ['students'] })
  → SchoolLayout wraps SchoolStudentsPage
```

### Why `portal-internal`?

Next.js treats folders starting with `_` as [private folders](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)
(opted out of routing). The dispatcher route sits at `app/(portal)/portal-internal/[...slug]/page.tsx`
so it generates a real route. Direct browser access to `/portal-internal/*` is blocked by the
middleware with a 404 before the route handler runs.

## Key Files

| File | Purpose |
|---|---|
| `app/sdk/src/routing/portal.ts` | `RoutePortal`, `RouteApiPortal`, `PortalRouteBuilder`, `PortalRegisterOptions`, `portalPrefixSet`, registries |
| `app/(portal)/portal-internal/[...slug]/page.tsx` | Internal dispatcher (middleware rewrite only) |
| `lib/portals/runtime.tsx` | `resolvePortalPage()`, CSS injection, `{param}` pattern matching |
| `lib/portals/all-portals.ts` | Bootstrap entry — imports `all-portals.generated.ts` |
| `lib/portals/all-portals.generated.ts` | **Auto-generated** by `modules:prepare` from `portalInit` field in `module.json` |
| `lib/portals/role-routing.ts` | `resolveRoleRedirect(role, canAccessAdmin)` — post-login redirect logic |
| `lib/routing/proxies.ts` | `proxyAuth`, `proxyRoles()`, `proxyAdmin` — host middleware proxy functions wired into SDK bootstrap |
| `lib/routing/all-routes.generated.ts` | **Auto-generated** by `modules:prepare` from `routesEntry` field in `module.json` |
| `lib/routing/with-api-route.ts` | `withApiRouteEntries()` bridge for typed `app/api/*/route.ts` handlers |
| `proxy.ts` | Detects `portalPrefixSet`, runs proxy chain, rewrites to `portal-internal` |

## Two-File Split: Edge vs Node.js

Portals require two files in every module because middleware runs in a separate edge runtime:

| File | Runtime | Responsibility |
|---|---|---|
| `src/routes.ts` | Edge (middleware) | `RoutePortal` factory, `.name()` calls, proxy chains, `RouteApiPortal` |
| `src/portal-init.ts` | Node.js (server) | `.page()` loaders, `.register()` with layout + theme + CSS config |

**Never import `portal-init.ts` from `routes.ts` or any edge-safe file.**
**Never call `.page()` or `.register()` from `routes.ts`.**
**Do not import `@/lib/routing/area-setup` from module code.** The host bootstraps routing before `routes.ts`, `portal-init.ts`, and API dispatchers consume SDK route metadata.

## Auto-Registration via `module.json`

Declare two fields in `module.json` and run `pnpm modules:prepare` — no manual bootstrap edits:

```json
{
  "moduleId": "mod.school",
  "moduleMode": "source-host",
  "version": "0.1.0",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.5.0",
  "routesEntry": "src/routes.ts",
  "portalInit": "src/portal-init.ts"
}
```

`modules:prepare` appends the import to:
- `lib/routing/all-routes.generated.ts` — edge context (proxy chain)
- `lib/portals/all-portals.generated.ts` — Node.js context (page registry)

---

## Creating a Portal — Step by Step

### Step 1: Module structure

```
modules/mod.school/
  module.json
  src/
    constants.ts        ← MODULE_ID + PORTAL_NAME
    routes.ts           ← EDGE-SAFE
    portal-init.ts      ← NODE.JS only
    manifest.ts         ← defineModule()
  portal/
    school/
      layout.tsx
      home/
        page.tsx
      students/
        page.tsx
        [id]/
          page.tsx
```

### Step 2: `src/constants.ts`

```ts
export const SCHOOL_MODULE_ID = 'mod.school';
export const SCHOOL_PORTAL_NAME = 'school';
```

### Step 3: `src/routes.ts` (edge-safe)

**Standalone portal (default) — served at `/school/*`:**

```ts
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';
import { SCHOOL_PORTAL_NAME } from './constants';

// Standalone (default) — served at /school/*
export const SchoolRoute = RoutePortal(SCHOOL_PORTAL_NAME);

export const SchoolRoutes = {
  home:     SchoolRoute('').name('school.home'),
  students: SchoolRoute('students').auth().name('school.students'),
  reports:  SchoolRoute('reports').roles('teacher', 'owner').name('school.reports'),
  student:  SchoolRoute('students/{id}').auth().name('school.student'),
} as const;
```

**Dashboard area portal — served at `/dashboard/school/*`:**

```ts
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';
import { SCHOOL_PORTAL_NAME } from './constants';

// Dashboard area — served at /dashboard/school/*
// Useful for multi-server setups where /dashboard/* runs on a dedicated server
export const SchoolRoute = RoutePortal(SCHOOL_PORTAL_NAME, { area: 'dashboard' });

// .auth() uses proxyAuth (same as /dashboard/* area)
// .roles(...) restricts to specific roles without host imports
export const SchoolRoutes = {
  home:     SchoolRoute('').auth().name('school.home'),
  students: SchoolRoute('students').auth().name('school.students'),
  reports:  SchoolRoute('reports').roles('teacher').name('school.reports'),
  student:  SchoolRoute('students/{id}').auth().name('school.student'),
} as const;

// API routes at /api/school/*
export const SchoolApi = RouteApiPortal(SCHOOL_PORTAL_NAME);
export const SchoolApiRoutes = {
  studentsList:  SchoolApi('/students').GET().auth('user').name('school.api.students'),
  studentDetail: SchoolApi('/students/{id}').GET().auth('user').name('school.api.student'),
} as const;
```

Declaring `SchoolApiRoutes` only creates typed metadata. `/api/school/*` becomes active
only after you add host bridge files under `app/api/school/*/route.ts`.

### Step 4: `src/portal-init.ts` (Node.js only)

```ts
import { SchoolRoute } from './routes';
import { SCHOOL_PORTAL_NAME } from './constants';

// Register page components (lazy imports)
SchoolRoute('').page(() => import('../portal/school/home/page'));
SchoolRoute('students').page(() => import('../portal/school/students/page'));
SchoolRoute('reports').page(() => import('../portal/school/reports/page'));
SchoolRoute('students/{id}').page(() => import('../portal/school/students/[id]/page'));

// Register portal metadata
SchoolRoute.register({
  layout: () => import('../portal/school/layout'),
  userTheme: false,
  // coreCss: true        → default: frontend core CSS (globals + Tailwind)
  // coreCss: 'dashboard' → dashboard core CSS
  // coreCss: false       → no core CSS — use head.css
  // head: { css: ['/school.css'], js: [] },
  redirectRoles: ['teacher'],   // users with role 'teacher' → /school after login
  // isDefaultPortal: true,     // ALL non-admin users → /school after login
});

export { SCHOOL_PORTAL_NAME };
```

### Step 5: Portal layout (`portal/school/layout.tsx`)

```tsx
import type { PortalLayoutProps } from '@skitsaas/sdk';

export default function SchoolLayout({ children, portalCtx }: PortalLayoutProps) {
  // portalCtx: { name, area?, context?, userTheme, routeArea }
  // routeArea: 'standalone' | 'dashboard'
  // Full ownership — no marketing nav, no dashboard sidebar
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header>School Portal — {portalCtx.name}</header>
      <main>{children}</main>
    </div>
  );
}
```

### Step 6: Portal page (`portal/school/home/page.tsx`)

```tsx
type PageProps = {
  slug: string[];
  params: Record<string, string>;   // {param} captures from path pattern
  searchParams: Record<string, string | string[] | undefined>;
};

export default function SchoolHomePage({ slug, params, searchParams }: PageProps) {
  return <div>School home</div>;
}
```

For dynamic routes like `students/{id}`, `params.id` holds the captured value.

### Step 7: `module.json`

```json
{
  "moduleId": "mod.school",
  "moduleMode": "source-host",
  "version": "0.1.0",
  "sourceEntry": "src/manifest.ts",
  "sdkRange": "^1.5.0",
  "routesEntry": "src/routes.ts",
  "portalInit": "src/portal-init.ts"
}
```

### Step 8: Activate

```bash
pnpm modules:prepare   # generates all-routes.generated.ts + all-portals.generated.ts
pnpm dev
```

Navigate to `http://localhost:3000/school` (standalone) or `http://localhost:3000/dashboard/school` (dashboard area).

---

## CSS Loading

When `userTheme: false`, the runtime automatically injects the core CSS bundle.

The default bundle depends on the portal's `area`:

| `area` | Default `coreCss` |
|---|---|
| `'standalone'` | `'frontend'` (frontend globals + Tailwind) |
| `'dashboard'` | `'dashboard'` (dashboard globals + Tailwind) |

Override with the `coreCss` option in `.register()`:

| `coreCss` value | Bundle loaded |
|---|---|
| *(omitted)* | Area default (see above) |
| `true` or `'frontend'` | `/.generated/core-assets/frontend/core-*.css` |
| `'dashboard'` | `/.generated/core-assets/dashboard/core-*.css` |
| `false` | Nothing — bring your own via `head.css` |

Extra assets in `head: { css: [...], js: [...] }` are injected **after** the core bundle.

When `userTheme` is set to a theme ID string, the theme asset system (`resolveAreaAssetHrefsBySelection`)
takes over and `coreCss`/`head` are ignored.

---

## Role-Based Access Control

Two independent mechanisms. Use both together for complete control:

### 1. Middleware enforcement — `.roles(...)` in `routes.ts`

Enforced **before** the page renders. The SDK route builder stores the role requirement and the host resolves it to the DB-backed role proxy during routing bootstrap.

```ts
const SchoolRoute = RoutePortal('school');

// Per-route restriction:
SchoolRoute('reports').roles('teacher', 'owner').name('school.reports');

// Auth only (any logged-in user):
SchoolRoute('home').auth().name('school.home');
```

If most routes share the same guard, apply `.auth()` / `.roles(...)`
consistently to each declared route, or wrap `SchoolRoute(path)` in a small
module-local helper that adds the guard before `.name()`.

Redirect behaviour:
- No session → `/sign-in`
- Session but wrong role → `/dashboard`

### 2. Post-login redirect — `redirectRoles` / `isDefaultPortal` in `portal-init.ts`

Controls where the user lands **after logging in**. Does not restrict access.

```ts
SchoolRoute.register({
  ...
  redirectRoles: ['teacher'],   // users with role 'teacher' → /school after login
});
```

Priority order in `lib/portals/role-routing.ts`:
1. `canAccessAdmin` → `/admin`
2. `redirectRoles` match → `/<portalName>` (standalone) or `/dashboard/<portalName>` (dashboard area)
3. `isDefaultPortal: true` → same as above (fallback for all non-admin users)
4. Default → `/dashboard`

**Rule**: use `.roles(...)` to lock the portal, use `redirectRoles` to route users there conveniently.

---

## API Routes

Portal API endpoints live at `/api/<portalName>/*`, but `RouteApiPortal(...)` only declares
typed route metadata. Unlike module APIs under `/api/modules/<moduleId>/*`, portal APIs are
not dispatched through the module runtime catch-all route. Activate them with host bridge files
under `app/api/<portalName>/*/route.ts` and wrap the typed entries with `withApiRouteEntries(...)`.

```ts
// src/routes.ts
export const SchoolApi = RouteApiPortal('school');
export const SchoolApiRoutes = {
  studentsList: SchoolApi('/students').GET().auth('user').name('school.api.students.list'),
  studentDetail: SchoolApi('/students/{id}').GET().auth('user').name('school.api.students.detail'),
} as const;
```

```ts
// app/api/school/students/route.ts
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { SchoolApiRoutes } from '@/../modules/mod.school/src/routes';

export const GET = withApiRouteEntries(
  SchoolApiRoutes.studentsList.handler(async () => {
    return Response.json({ students: [] });
  })
);
```

```ts
// app/api/school/students/[id]/route.ts
import { withApiRouteEntries } from '@/lib/routing/with-api-route';
import { SchoolApiRoutes } from '@/../modules/mod.school/src/routes';

export const GET = withApiRouteEntries(
  SchoolApiRoutes.studentDetail.handler(async (_request, params) => {
    return Response.json({ id: params.id });
  })
);
```

`ApiMethodRouteBuilder.handler(...)` returns an `ApiRouteEntry`, not a Next.js route handler.
The current bridge helper is `withApiRouteEntries(...)`; older `.nextHandler` examples are stale.

---

## Multiple Portals in One App

Each module registers its own portal independently. They coexist without conflict.

```
/school            → mod.school (standalone, role: teacher)
/guardian          → mod.guardian (standalone, role: guardian)
/hub               → mod.example.portal (standalone, redirectRoles: ['hubrole'])
/dashboard/support → mod.support (dashboard area, role: support-agent)
```

Post-login redirect resolves the **first** `redirectRoles` match across all registered portals.
`isDefaultPortal` acts as the catch-all fallback.

Dashboard area portals are grouped under `/dashboard/*` — useful for multi-server deployments
where the dashboard server is separate from the frontend server.

---

## Reference: `RoutePortal` Signature

```ts
RoutePortal(name: string, options?: { area?: 'standalone' | 'dashboard' }): PortalRouteFactory
RoutePortal(configs: PortalConfig[], options?: { area?: 'standalone' | 'dashboard' }): PortalRouteFactory

// Examples:
const HubRoute    = RoutePortal('hub');                            // /hub/*
const SchoolRoute = RoutePortal('school', { area: 'dashboard' }); // /dashboard/school/*
```

## Reference: `PortalRegisterOptions`

```ts
type PortalRegisterOptions = {
  /** Lazy layout component loader */
  layout: () => Promise<{ default: ComponentType<PortalLayoutProps> }>;

  /** Theme ID to load via the theme asset system, or false for no theme */
  userTheme: string | false;

  /**
   * Core CSS bundle. Default: true (frontend bundle).
   * false = no core CSS. 'dashboard' = dashboard bundle.
   * Ignored when userTheme is set.
   */
  coreCss?: boolean | 'frontend' | 'dashboard';

  /** Extra CSS/JS URLs injected after the core bundle */
  head?: { css?: string[]; js?: string[] };

  /**
   * Roles redirected to this portal after login.
   * e.g. ['teacher'] → users with role 'teacher' land at /<portalName>
   */
  redirectRoles?: string[];

  /**
   * If true, all non-admin authenticated users land here after login
   * when no redirectRoles match is found. Acts as the global fallback.
   */
  isDefaultPortal?: boolean;
};
```

---

## Production Constraints

### Two-file sync is a security responsibility

`matchRouteProxyChain` runs in middleware (edge) and finds the proxy chain for a path by scanning
routes registered via `.name()`. Routes are registered when `.name()` is called in `routes.ts`.

**If a path is registered with `.page()` in `portal-init.ts` but has no matching `.name()` entry
in `routes.ts`, the middleware has no chain for that path — it falls back to `frontend` defaults
(empty `[]`) and the page renders without any auth enforcement.**

Rule: every `.page()` in `portal-init.ts` must have a matching entry in `routes.ts` that calls
`.name()` with the appropriate proxy chain.

```
portal-init.ts                                           routes.ts
SchoolRoute('reports').page(...)      ← must match →    SchoolRoute('reports')
                                                           .roles('teacher')
                                                           .name('school.reports')
```

### `admin-only` surface mode

When `APP_SURFACE_MODE=admin-only`, all non-`/admin/*` paths return 404 before the portal
check. Portals are intentionally unavailable in this mode.

### 404 page

`notFound()` thrown inside `resolvePortalPage()` (unknown portal name, unregistered slug) is
caught by `app/(portal)/not-found.tsx`. This page uses inline styles because portal CSS is
injected inside `resolvePortalPage()` — which does not run when `notFound()` is thrown.

## Verification Checklist

```bash
pnpm modules:prepare           # regenerates generated files; fails on collisions
pnpm exec tsc --noEmit         # full typecheck
pnpm dev                       # navigate to /<portalName>
```

Manual checks:
- [ ] `/<portalName>` (standalone) or `/dashboard/<portalName>` (dashboard area) renders without area chrome
- [ ] Unauthenticated access to protected routes → redirect to `/sign-in`
- [ ] Authenticated user with wrong role → redirect to `/dashboard`
- [ ] Authenticated user with correct role → page renders
- [ ] `/portal-internal/*` direct access returns 404
- [ ] Post-login redirect lands on the portal (not `/dashboard`)
