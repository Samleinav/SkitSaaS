---
name: mod-routing-api-permissions
description: Implement routing, API handlers, server actions, permissions, rate limiting, and navigation widgets for source-package modules. Use this skill when adding module routes, API endpoints, server actions, route aliases, nav items, or enforcing access control inside a module.
---

# mod-routing-api-permissions

## Scope

Module routes (admin + dashboard + API), permissions, server actions, rate limiting, nav items, route aliases, and nav widgets (API/permissions perspective).

## Required References

- `docs/modules/02-runtime-routing.md` — dispatcher routes, alias resolver, route context
- `docs/modules/03-permissions-actions.md` — permissions model, server actions, rate limiting
- `docs/modules/06-nav-widgets.md` — nav items + widgets (load `mod-ui-forms-validation` for UI/rendering side)
- `docs/modules/07-api-modules.md` — API dispatcher contract
- `docs/sdk/00-overview.md` — `createModuleApiRouter`, `createModulePageRouter`, `withRateLimit`, route factories

## Boundary Rules

```
FORBIDDEN:
  @/lib/routing/rate-limit            (use withRateLimit from @skitsaas/sdk)
  getDashboardFeatureController       (host-only, no module-safe version yet — see SDK gap below)
  getCurrentFeatureControllerByScope  (host-only)
  adminAction, dashboardAction        (host-only controllers)

REQUIRED for API routes:    createModuleApiRouter      → @skitsaas/sdk/server
REQUIRED for page routes:   createModulePageRouter     → @skitsaas/sdk/server
REQUIRED for server actions: createValidatedServerActionController → @skitsaas/sdk/server
REQUIRED for rate limiting: withRateLimit, checkRateLimit → @skitsaas/sdk
```

## Dispatcher Routes

Modules are served at:

- `/admin/modules/[moduleId]/[[...slug]]`
- `/dashboard/modules/[moduleId]/[[...slug]]`
- `/api/modules/[moduleId]/[[...slug]]`

Use `adminRouteAliases` / `dashboardRouteAliases` in manifest for friendly URLs.

## API Handler

```ts
import { createModuleApiRouter } from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: () => Response.json({ ok: true })
    },
    {
      method: 'POST',
      path: '/items',
      auth: 'user',              // 'none' | 'user' | 'admin'
      roles: ['admin', 'owner'], // optional extra role check
      handler: async ({ user, params, body }) => {
        return Response.json({ ok: true });
      }
    }
  ]
});
```

## Page Handler

```ts
import { createModulePageRouter } from '@skitsaas/sdk/server';

export const adminPageHandler = createModulePageRouter({
  routes: [
    { path: '/', handler: () => <div>List</div> },
    { path: '/new', auth: 'user', handler: () => <div>Create</div> },
    { path: '/:id/edit', auth: 'user', handler: ({ params }) => <div>{params.id}</div> }
  ]
});
```

## Server Actions

For module forms use `createValidatedServerActionController` (never host-only `adminAction`):

```ts
'use server'
import { createValidatedServerActionController } from '@skitsaas/sdk/server';
import { myForm } from './forms';

const controller = createValidatedServerActionController(myForm);

export const createItemAction = controller.action(async ({ values }) => {
  // values are already validated server-side
  return { ok: true };
});
```

## Rate Limiting

```ts
import { withRateLimit } from '@skitsaas/sdk';

// Inside API handler:
const limited = await withRateLimit('mod.<id>.endpoint', clientIp, { max: 10, windowMs: 60_000 });
if (!limited.ok) return Response.json({ error: 'rate_limit' }, { status: 429 });
```

## Nav Items and Route Aliases

In manifest:

```ts
adminNavItems: [{ label: 'Items', href: '/admin/my-module', icon: 'list' }],
adminRouteAliases: { '/admin/my-module': '/' },
dashboardNavItems: [{ label: 'Items', href: '/dashboard/my-module', icon: 'list' }],
dashboardRouteAliases: { '/dashboard/my-module': '/' },
```

Rules:
- Aliases cannot collide with core routes.
- Nav item `href` must point to the alias (not the dispatcher URL).
- For nav widget API calls, rate-limit the endpoint and guard with `auth: 'user'`.

## Nav Widgets

Nav widgets live at the intersection of UI + API. For the UI/slot/rendering side of a widget, load `mod-ui-forms-validation` alongside this skill.

When a widget makes API calls, it must:
1. Call a module API route (`/api/modules/<moduleId>/...`), not host endpoints.
2. Apply rate limiting on the API route.
3. Guard with appropriate `auth` level.

## Subscription Feature Gates (SDK Gap)

**Current state:** no module-safe subscription feature controller exists.

`getDashboardFeatureController` (host path) is FORBIDDEN in module code.

**Workaround:**
- Use `getModuleConfigValue` from `@skitsaas/sdk/server` for module-owned feature flags stored under `module.<moduleId>.*` namespace in `app_configs`.
- If true plan-gated access (subscription tier check) is needed, log the gap and escalate:

```
1. Add entry in docs/reference/05-sdk-changelog.md:
   type: gap
   summary: module-safe subscription feature controller missing
   sdk_surface: @skitsaas/sdk/server
   module: <your module>
2. Escalate to core-sdk-evolution skill.
3. Do not import host feature controller — implement after SDK exposes the contract.
```
