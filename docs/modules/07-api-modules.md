---
title: API Modules
sidebar_position: 7
---

# API Modules

API modules are handled by the dispatcher route:

```
/api/modules/[moduleId]/[[...slug]]
```

The handler is defined in the manifest as `apiHandler`.

## Contract

```ts
type ModuleApiHandler = (
  request: Request,
  context: ModuleRouteContext
) => Promise<Response>;
```

Use `context.slug` to route internally, or use the SDK router helper for declarative registration.

## Recommended: Declarative Router

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
      roles: ['admin', 'owner'],
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

The dispatcher does **not** apply auth by itself. Auth is your responsibility in module code.

With `createModuleApiRouter`, use `auth` and `roles`. For domain-specific checks
(team membership, feature gates, ownership), keep them in `canAccess` or inside the route handler.

## Errors

Return explicit status codes and JSON errors. The helper already returns default `404/405/401/403` responses.

## Next.js Note

Next.js route handlers are filesystem-based (`route.ts`). There is no built-in runtime registry like Laravel `Route::...` for dynamically loaded modules. In this project, the module dispatcher + `createModuleApiRouter` is the equivalent abstraction.
