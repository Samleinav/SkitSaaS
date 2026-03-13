---
name: mod-portal-authoring
description: Create a named portal for a SKSS module — independent layout, auth, role-based access, CSS loading, and API routes. Use this skill when building a new portal (e.g. /school, /guardian, /hub) or modifying an existing one.
---

# mod-portal-authoring

## Goal

Create a complete, working portal for a SKSS module:

- served at `/<portalName>/*` (standalone) or `/dashboard/<portalName>/*` (dashboard area)
- completely independent layout — no marketing nav, no dashboard sidebar
- two-file split: `routes.ts` (edge) + `portal-init.ts` (Node.js)
- auto-registered via `module.json` fields (no manual bootstrap edits)
- role-based access via `.auth()` / `.roles()` in SDK route builders + `redirectRoles` (post-login)
- CSS loaded by default (frontend core bundle for standalone, dashboard core bundle for dashboard area)

## Required Reading Before Starting

Read these files before writing any code:

- `docs/portals/01-portal-system.md` — full reference (architecture, examples, options)
- `AGENTS.md` section "Portal system"
- `modules/mod.example.portal/src/routes.ts` — canonical edge example
- `modules/mod.example.portal/src/portal-init.ts` — canonical Node.js example
- `modules/mod.example.portal/portal/hub/layout.tsx` — canonical layout example
- `docs/routing/02-routes.md` — current route-builder auth/roles behavior

## Checklist

Work through these in order. Do not skip steps.

### 1. Decide the portal name, area, and access model

- Portal name: short, URL-safe, lowercase (e.g. `school`, `guardian`, `hub`)
- Portal area:
  - `'standalone'` (default) — served at `/<name>/*`, frontend CSS default
  - `'dashboard'` — served at `/dashboard/<name>/*`, dashboard CSS default
    → Use `'dashboard'` when the portal belongs to the authenticated user experience
      and you want it on the same server as `/dashboard/*` in multi-server deployments
- Access model: public / auth-only / role-restricted
- Post-login behaviour: `redirectRoles`, `isDefaultPortal`, or neither

### 2. Create `src/constants.ts`

```ts
export const SCHOOL_MODULE_ID = 'mod.school';
export const SCHOOL_PORTAL_NAME = 'school';
```

### 3. Create `src/routes.ts` (edge-safe)

Rules:
- keep this file SDK-first; no host bootstrap import is needed in module `routes.ts`
- use only `@skitsaas/sdk` plus module-local constants in the normal path
- No React imports, no DB imports, no `portal-init` imports
- `.auth()` = any logged-in user; `.roles('teacher')` = role-restricted
- `.name('portalName.routeKey')` is optional but recommended for URL generation

```ts
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';
import { SCHOOL_PORTAL_NAME } from './constants';

// Standalone (default) — served at /school/*
export const SchoolRoute = RoutePortal(SCHOOL_PORTAL_NAME);

// Dashboard area — served at /dashboard/school/*
// export const SchoolRoute = RoutePortal(SCHOOL_PORTAL_NAME, { area: 'dashboard' });

export const SchoolRoutes = {
  home:    SchoolRoute('').name('school.home'),
  list:    SchoolRoute('students').auth().name('school.students'),
  detail:  SchoolRoute('students/{id}').auth().name('school.student'),
  reports: SchoolRoute('reports').roles('teacher').name('school.reports'),
} as const;

export const SchoolApi = RouteApiPortal(SCHOOL_PORTAL_NAME);
export const SchoolApiRoutes = {
  list:   SchoolApi('/students').GET().auth('user').name('school.api.students.list'),
  detail: SchoolApi('/students/{id}').GET().auth('user').name('school.api.students.detail'),
} as const;
```

### 4. Create `src/portal-init.ts` (Node.js only)

Rules:
- Never import from edge files in the host app except `./routes` and `./constants`
- `.page()` loaders use dynamic imports — never eagerly import components
- `.register()` is called exactly once
- `coreCss` defaults to the area's core bundle — no extra work needed

```ts
import { SchoolRoute } from './routes';
import { SCHOOL_PORTAL_NAME } from './constants';

SchoolRoute('').page(() => import('../portal/school/home/page'));
SchoolRoute('students').page(() => import('../portal/school/students/page'));
SchoolRoute('students/{id}').page(() => import('../portal/school/students/[id]/page'));
SchoolRoute('reports').page(() => import('../portal/school/reports/page'));

SchoolRoute.register({
  layout: () => import('../portal/school/layout'),
  userTheme: false,
  // coreCss default: 'frontend' for standalone, 'dashboard' for dashboard area portals
  // coreCss: true / 'frontend'  → frontend core CSS (globals + Tailwind)
  // coreCss: 'dashboard'        → dashboard core CSS
  // coreCss: false              → no core CSS — provide head.css
  // head: { css: ['/school.css'], js: [] },
  redirectRoles: ['teacher'],
  // isDefaultPortal: true,   // use instead of redirectRoles to catch all non-admin users
});

export { SCHOOL_PORTAL_NAME };
```

### 5. Create the portal layout

File: `portal/<portalName>/layout.tsx`

```tsx
import type { PortalLayoutProps } from '@skitsaas/sdk';

export default function SchoolLayout({ children, portalCtx }: PortalLayoutProps) {
  // portalCtx: { name, area?, context?, userTheme, routeArea }
  // routeArea: 'standalone' | 'dashboard'
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b px-6 py-3 font-semibold">
        School Portal
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

The layout gets `children` (the current page) and `portalCtx`. It fully owns the visual chrome —
no nav items are injected by the framework.

### 6. Create portal pages

File pattern: `portal/<portalName>/<path>/page.tsx`
For dynamic segments: `portal/<portalName>/<path>/[id]/page.tsx` (Next.js folder name) but
route pattern declared as `students/{id}` (curly braces in `routes.ts` / `portal-init.ts`).

```tsx
// portal/school/students/[id]/page.tsx
type PageProps = {
  slug: string[];
  params: Record<string, string>;   // {id} → params.id
  searchParams: Record<string, string | string[] | undefined>;
};

export default function StudentDetailPage({ params }: PageProps) {
  return <div>Student: {params.id}</div>;
}
```

### 7. Update `module.json`

Add exactly these two fields (keep existing fields):

```json
{
  "routesEntry": "src/routes.ts",
  "portalInit": "src/portal-init.ts"
}
```

### 8. Activate

```bash
pnpm modules:prepare
pnpm dev
```

---

## Role Access — Decision Table

| Requirement | Where to configure |
|---|---|
| Block unauthenticated users from entire portal | Apply `.auth()` to every declared route in `routes.ts` |
| Block unauthenticated users per route | `.auth()` on each route in `routes.ts` |
| Block wrong-role users from entire portal | Apply `.roles('role')` to every declared route in `routes.ts` |
| Block wrong-role users per route | `.roles('role')` on that route in `routes.ts` |
| Users with role land here after login | `redirectRoles: ['role']` in `.register()` in `portal-init.ts` |
| All non-admin users land here after login | `isDefaultPortal: true` in `.register()` in `portal-init.ts` |

Role guards use the same host-wired route builder middleware as the rest of the
SDK route system: no session redirects to the auth flow, wrong role redirects
to the dashboard fallback.

---

## CSS — Decision Table

| Requirement | Config |
|---|---|
| Use Tailwind + frontend tokens (standalone default) | omit `coreCss` |
| Use Tailwind + dashboard tokens (dashboard area default) | omit `coreCss` |
| Force frontend CSS regardless of area | `coreCss: 'frontend'` or `coreCss: true` |
| Force dashboard CSS on standalone portal | `coreCss: 'dashboard'` |
| Bring own stylesheet, no Tailwind | `coreCss: false`, `head: { css: ['/my.css'] }` |
| Use a registered app theme | `userTheme: 'theme.first.frontend'` (ignores `coreCss`/`head`) |

---

## Production Constraints

### Two-file sync: routes.ts and portal-init.ts MUST stay in sync

**This is the most important rule for security.**

`matchRouteProxyChain` is middleware (edge). It finds the proxy chain for a path by scanning
registered routes. A route is only registered when `.name()` is called in `routes.ts`.

If you add `.page()` for a path in `portal-init.ts` but DO NOT add the corresponding entry in
`routes.ts`, the path has **no proxy chain** — middleware falls back to `frontend` defaults (empty `[]`)
and the page is accessible without any auth check.

**Rule:** Every `.page()` in `portal-init.ts` must have a matching entry in `routes.ts` that calls `.name()` and sets the correct proxy chain.

```
portal-init.ts                routes.ts
SchoolRoute('reports').page() ← must match → SchoolRoute('reports').roles('teacher').name('school.reports')
```

### `admin-only` surface mode disables portals

When `APP_SURFACE_MODE=admin-only`, all non-`/admin/*` paths return 404 before the portal
check runs. Portals are intentionally disabled in this mode.

### 404 page

Portal `notFound()` is caught by `app/(portal)/not-found.tsx`. It uses inline styles because
the portal CSS is injected inside `resolvePortalPage()` — which does not run when `notFound()`
is thrown before the page renders.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Adding `.page()` in `portal-init.ts` without matching entry in `routes.ts` | **Security hole**: route has no auth check. Always pair them. |
| Calling `.page()` from `routes.ts` | Move `.page()` calls to `portal-init.ts` |
| Importing `portal-init.ts` from `routes.ts` | These are in separate runtimes — never cross-import |
| Folder named `_portal` or `_anything` in `app/` | Next.js treats `_` prefixed folders as private (no route generated) |
| Importing host bootstrap into module `routes.ts` | No longer needed; keep module routes SDK-first |
| `HubRoute('')` path ends in trailing slash `/hub/` | Fixed in SDK: trailing slashes are trimmed automatically |
| Not running `pnpm modules:prepare` after editing `module.json` | Generated files not updated → portal not registered |
| Setting `redirectRoles` but forgetting matching `.roles()` / `.auth()` guards | User is redirected to portal but has no access (infinite redirect loop risk) |

---

## Verification

```bash
pnpm modules:prepare
pnpm exec tsc --noEmit
pnpm dev
```

- [ ] `/<portalName>` (standalone) or `/dashboard/<portalName>` (dashboard area) renders without area chrome
- [ ] Unauthenticated access to protected routes → `/sign-in`
- [ ] Wrong role → `/dashboard`
- [ ] Correct role → page renders with portal layout
- [ ] `/portal-internal/*` direct access → 404
- [ ] Login with matching role → redirected to portal (not `/dashboard`)
- [ ] Core CSS (Tailwind) applied — text, borders, spacing visible
