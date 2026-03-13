---
title: API Modules
sidebar_position: 7
---

# API Modules

API modules are handled by the dispatcher route:

```
/api/modules/[moduleId]/[[...slug]]
```

The manifest can expose module APIs in two ways:

- preferred: `apiRoutes` built from `RouteApi(...).METHOD().handler(fn)`
- legacy: `apiHandler` from `createModuleApiRouter(...)`

## Contract

```ts
type ModuleApiHandler = (
  request: Request,
  context: ModuleRouteContext
) => Promise<Response>;
```

Use `context.slug` to route internally, or prefer typed route metadata for new modules.

## Preferred: typed `apiRoutes`

```ts
import { RouteApi } from '@skitsaas/sdk';

const BASE = '/modules/mod.example.api';

export const ExampleApiRoutes = {
  health: RouteApi(`${BASE}/health`).GET().name('mod.example.api.health'),
  list: RouteApi(`${BASE}/items`).GET().auth('user').name('mod.example.api.items.list'),
  create: RouteApi(`${BASE}/items`).POST().auth('admin').name('mod.example.api.items.create'),
  update: RouteApi(`${BASE}/items/{itemId}`).PATCH().auth('user').name('mod.example.api.items.update'),
} as const;
```

```ts
import { defineModule } from '@skitsaas/sdk';
import { ExampleApiRoutes } from './routes';

export default defineModule({
  moduleId: 'mod.example.api',
  version: '0.1.0',
  displayName: 'Example API',
  apiRoutes: [
    ExampleApiRoutes.health.handler(() => Response.json({ ok: true })),
    ExampleApiRoutes.list.handler(() => Response.json({ items: [] })),
    ExampleApiRoutes.create.handler(() => Response.json({ ok: true }, { status: 201 })),
    ExampleApiRoutes.update.handler((_request, params) =>
      Response.json({ itemId: params.itemId })
    )
  ]
});
```

Typed route builders support:

- method control (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- auth policy via `.auth('none' | 'user' | 'admin')`
- role allowlists via `.roles(...)`
- rate limiting via `.rateLimit(...)`
- extra proxy checks via `.proxy([...])`
- named URL registration via `.name(...)`

## Legacy: `createModuleApiRouter`

Still supported for migration work and existing modules such as `mod.example.suite`.

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
      auth: 'user',
      roles: ['admin'],
      handler: ({ user }) => Response.json({ ok: true, userId: user?.id })
    },
    {
      method: 'PATCH',
      path: '/items/:itemId',
      auth: 'user',
      handler: ({ params }) => Response.json({ itemId: params.itemId })
    }
  ]
});
```

`createModuleApiRouter` supports:

- method control (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `ANY`)
- path matching by slug with params (`/items/:itemId`)
- auth policy (`public`, `user`, `admin`)
- role requirements (`roles: [...]`)
- extra permission logic (`canAccess`)
- consistent `404`, `405`, `401`, `403` defaults (customizable via options)

## Authentication

The dispatcher does not apply a blanket auth policy to every module API.
Authentication and authorization come from the route contract:

- typed routes: `.auth(...)`, optional `.roles(...)`, optional `.proxy([...])`
- legacy router: `auth`, `roles`, and `canAccess`

For domain-specific checks such as team membership, feature gates, or ownership,
keep the decision in route proxies, `canAccess`, or the route handler.

## Errors

Return explicit status codes and JSON errors. The helper already returns default `404/405/401/403` responses.

## Next.js Note

Next.js route handlers are filesystem-based (`route.ts`). There is no built-in
runtime registry like Laravel `Route::...` for dynamically loaded modules. In
this project, the module dispatcher plus `apiRoutes` or `createModuleApiRouter`
is the equivalent abstraction.
