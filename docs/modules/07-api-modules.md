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

- preferred: typed `apiRoutes`, where route metadata is declared first with
  `RouteApi(...).METHOD()` and handlers are attached later with `.handler(fn)`
- legacy: `apiHandler`, a single request handler/router created with
  `createModuleApiRouter(...)`

## Contract

```ts
type ModuleApiHandler = (
  request: Request,
  context: ModuleRouteContext
) => Promise<Response>;
```

Use `context.slug` to route internally, or prefer typed route metadata for new modules.

## Important distinction

There are three related pieces here:

- `RouteApi(...).METHOD()` in `routes.ts`:
  metadata-only route registration
- `apiRoutes` in `manifest.ts`:
  the final typed route entries after attaching handlers with `.handler(fn)`
- `apiHandler`:
  one legacy all-in-one router/handler function

That means `apiRoutes` is not "metadata only" by itself. The metadata-only part
is the builder definition you keep in `routes.ts`.

This split exists on purpose:

- `routes.ts` stays edge-safe and lightweight
- the host can load route metadata, names, auth, rate limits, and proxies
  without eagerly importing heavy handler modules
- middleware and other metadata consumers do not pay the cost of loading backend
  handlers they will never execute
- actual request handling still happens only when the module API dispatcher
  resolves the manifest and dispatches the matched entry

## Preferred: typed `apiRoutes`

Put the route contract in `routes.ts` and keep handler imports out of that file.
Then attach the handlers in `manifest.ts`.

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

The key architectural benefit is that `routes.ts` can be imported where only
route metadata is needed, while handler code remains in the Node.js manifest
path and loads only for actual API dispatch.

## Legacy: `createModuleApiRouter`

Still supported for migration work and existing modules such as `mod.example.suite`.

With this style, matching, auth metadata, and handler dispatch live together in
the same router definition. That is simpler for older modules, but it does not
provide the same metadata-first separation as the typed `RouteApi(...).METHOD()`
plus `apiRoutes` pattern.

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
