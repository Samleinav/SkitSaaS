---
title: "Portal And Module API Examples"
sidebar_position: 0
---

# Portal And Module API Examples

Use this page when the generic architecture docs are not enough and you need a
concrete example flow tied to real example modules.

## Example 1: Portal Request

The canonical portal example is:

- `modules/mod.example.portal`

### Files That Matter

- route metadata:
  `modules/mod.example.portal/src/routes.ts`
- Node.js page registration:
  `modules/mod.example.portal/src/portal-init.ts`
- module README:
  `modules/mod.example.portal/README.md`
- internal dispatcher:
  `app/(portal)/portal-internal/[...slug]/page.tsx`

### Concrete Flow

For a request like:

```txt
/hub/members/12
```

the ownership chain is:

1. `proxy.ts` receives the request
2. portal prefix detection sees `hub`
3. the resolved proxy chain runs first
4. if allowed, the request is rewritten to:
   `/portal-internal/hub/members/12`
5. the portal dispatcher resolves the portal page
6. the layout and page registered in `portal-init.ts` own the final render

### Why The Two-File Split Matters

`src/routes.ts` is for:

- `RoutePortal(...)`
- `.name()`
- auth/roles/proxy metadata
- `RouteApiPortal(...)`

`src/portal-init.ts` is for:

- `.page(...)`
- `.register(...)`
- layout, CSS, and redirect configuration

Do not collapse those into one file.

### Copyable Portal Starter

```ts
// src/routes.ts
import { RoutePortal, RouteApiPortal } from '@skitsaas/sdk';

const HubRoute = RoutePortal('hub');
const HubApi = RouteApiPortal('hub');

export const HubRoutes = {
  home: HubRoute('').name('hub.home'),
  members: HubRoute('members').auth().name('hub.members'),
  report: HubRoute('reports').roles('teacher').name('hub.reports')
} as const;

export const HubApiRoutes = {
  membersList: HubApi('/members').GET().auth('user').name('hub.api.members.list')
} as const;
```

```ts
// src/portal-init.ts
import { HubRoute } from './routes';

HubRoute('').page(() => import('../portal/hub/home/page'));
HubRoute('members').page(() => import('../portal/hub/members/page'));

HubRoute.register({
  layout: () => import('../portal/hub/layout'),
  userTheme: false,
  coreCss: true,
  redirectRoles: ['teacher'],
  // isDefaultPortal: true
});
```

Use `redirectRoles` when only some roles should land there after login. Use
`isDefaultPortal: true` when non-admin users should land there by default.

## Example 2: Typed Module API

The canonical typed API example is:

- `modules/mod.example.api`

### Files That Matter

- route metadata:
  `modules/mod.example.api/src/routes.ts`
- handler attachment:
  `modules/mod.example.api/src/manifest.ts`
- README:
  `modules/mod.example.api/README.md`

### Pattern

This example uses the preferred split:

- `RouteApi(...).METHOD()` in `routes.ts`
- `apiRoutes: [...]` in `manifest.ts`

Benefits:

- route metadata stays lightweight
- auth and rate limits remain visible in the metadata layer
- handlers load only in the manifest path

## Example 3: Legacy Module API Router

The canonical legacy-but-still-valid example is:

- `modules/mod.example.package`

### Files That Matter

- manifest:
  `modules/mod.example.package/src/manifest.js`
- router:
  `modules/mod.example.package/src/api-handler.js`
- README:
  `modules/mod.example.package/README.md`

### Pattern

This module currently uses:

- `createModuleApiRouter(...)`
- `apiHandler` in the manifest

This is still supported, but it is not the preferred metadata-first pattern for
new modules.

## Access Matrix: `mod.example.package`

The most useful concrete example from that module is the `/items` API surface.

### `GET /api/modules/mod.example.package/items`

- no blanket auth requirement
- uses `resolveUser: true`
- can return different scopes depending on session state
- supports public, user, and admin-flavored behavior

### `POST /api/modules/mod.example.package/items`

- `auth: 'user'`
- authenticated create path

### `PATCH /api/modules/mod.example.package/items/:itemId`

- `auth: 'user'`
- user must own the record unless admin role overrides

### `DELETE /api/modules/mod.example.package/items/:itemId`

- `auth: 'admin'`
- admin-only delete path

## Dispatcher Ownership

Module APIs are always reached through:

- `app/api/modules/[moduleId]/[[...slug]]/route.ts`

That bridge delegates into:

- `lib/modules/runtime.ts`

Important implication:

- module page requests and module API requests do not share the same protection
  path
- page dispatch uses `proxy.ts` first
- module API dispatch does not

## Practical Rule

When documenting or implementing module APIs:

- use `mod.example.api` as the preferred typed example
- use `mod.example.package` only when you specifically need the legacy router
  pattern or a richer access-control example

## Common Mistakes

- explaining portals only abstractly without pointing to `mod.example.portal`
- using the legacy `apiHandler` example as if it were the preferred new-module path
- forgetting that `/api/modules/*` skips `proxy.ts`

## Related Docs

- `routing-and-route-factories.md`
- `proxies-and-api-security.md`
- `portals-and-aliases.md`
- `module-starter-playbook.md`
