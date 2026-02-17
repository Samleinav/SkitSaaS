---
title: Runtime Routing and Dispatch
sidebar_position: 2
---

# Runtime Routing and Dispatch

Dispatcher routes resolve modules by `moduleId` + `slug` and hand off to the runtime:

- Admin: `/admin/modules/[moduleId]/[[...slug]]`
- Dashboard: `/dashboard/modules/[moduleId]/[[...slug]]`
- Frontend: `/modules/[moduleId]/[[...slug]]`
- API: `/api/modules/[moduleId]/[[...slug]]`

Custom aliases are also supported through catch-all pages:

- Admin alias resolver: `/admin/[...moduleAlias]`
- Dashboard alias resolver: `/dashboard/[...moduleAlias]`
- Frontend alias resolver: `/[...moduleAlias]` (for non-core frontend paths only)

Aliases must be declared in the manifest (`adminRouteAliases` / `dashboardRouteAliases` / `frontendRouteAliases`).

## Route context

Handlers receive:

```ts
type ModuleRouteContext = {
  moduleId: string;
  slug: string[];
  searchParams?: Record<string, string | string[] | undefined>;
};
```

## Page handlers

`adminPage`, `dashboardPage`, and `frontendPage` must return:

- `ReactNode` (page content), or
- `null` to signal 404

Recommended registration:

```ts
import { createModulePageRouter } from '@skitsaas/sdk/server';

const adminPage = createModulePageRouter({
  routes: [
    { path: '/', handler: () => <Home /> },
    { path: '/settings', handler: () => <Settings /> },
    { path: '/items/:itemId', handler: ({ params }) => <Item id={params.itemId} /> }
  ]
});
```

Alias example:

```ts
defineModule({
  moduleId: 'mod.analytics',
  version: '1.0.0',
  displayName: 'Analytics',
  adminRouteAliases: ['/admin/custom/analytics'],
  adminNavItems: [
    {
      id: 'mod.analytics.nav',
      href: '/admin/custom/analytics',
      label: 'Analytics'
    }
  ],
  adminPage
});
```

For `/admin/custom/analytics/settings`, `slug` becomes `['settings']`.

## Frontend route access policy

Frontend module routes can declare auth policy in the manifest:

```ts
defineModule({
  moduleId: 'mod.contact.us',
  version: '1.0.0',
  displayName: 'Contact',
  frontendRouteAliases: ['/contact-us'],
  frontendRouteAccess: 'user', // public | user | admin
  frontendPage
});
```

Policy behavior:

- `public`: route is accessible without session
- `user`: unauthenticated requests redirect to `/login`
- `admin`: unauthenticated requests redirect to `/login`; non-admin users redirect to `/dashboard`

If omitted, `frontendRouteAccess` defaults to `public`.

## Frontend slots

Modules can expose embeddable frontend content via `frontendSlots`.
Host/theme can render these slots without direct `theme -> module` imports.

```ts
defineModule({
  moduleId: 'mod.contact.us',
  version: '1.0.0',
  displayName: 'Contact',
  frontendSlots: [
    {
      slotId: 'frontend.contact.form.primary',
      handler: async () => <ContactForm />
    }
  ]
});
```

Runtime resolution priority:

1. slot from target module (when `moduleId` is provided)
2. slot from first enabled module exposing same `slotId`
3. host/theme fallback

## Alias overlap behavior

- Overlapping aliases are rejected when they belong to different modules.
- Overlapping aliases are allowed inside the same module.
- Resolver chooses the longest matching alias first.

In most cases you only need one base alias (for example `/admin/custom/analytics`)
and handle subroutes with `slug`:

- `/admin/custom/analytics/create` -> `slug: ['create']`
- `/admin/custom/analytics/123/edit` -> `slug: ['123', 'edit']`

## API handlers

`apiHandler` must return a `Response`. If you return `null`, the dispatcher will answer 404.

Example:

```ts
import { createModuleApiRouter } from '@skitsaas/sdk/server';

const apiHandler = createModuleApiRouter({
  routes: [
    { method: 'GET', path: '/health', handler: () => Response.json({ ok: true }) },
    { method: 'POST', path: '/items', auth: 'user', handler: () => Response.json({ ok: true }) }
  ]
});
```

## Feature flag gates

Routes return 404 when:

- `FF_USE_MODULE_DISPATCHER_ROUTES` is false (default is true)
- `FF_USE_APP_MODULES_RUNTIME` is false (default is true)
- module is disabled in `app_modules`
- manifest is missing
- handler is missing

## Debugging

Runtime failures are tracked via migration metrics. Use:

- `pnpm restructure:module-runtime` to validate registry + DB state
