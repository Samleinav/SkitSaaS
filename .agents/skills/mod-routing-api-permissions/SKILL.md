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
- `docs/sdk/00-overview.md` — `RouteApi`, `createModulePageRouter`, `withRateLimit`, route factories

## Boundary Rules

```
FORBIDDEN:
  @/lib/routing/rate-limit            (use withRateLimit from @skitsaas/sdk)
  getDashboardFeatureController       (host-only, no module-safe version yet — see SDK gap below)
  getCurrentFeatureControllerByScope  (host-only)
  adminAction, dashboardAction        (host-only controllers)

PREFERRED for API routes:   RouteApi + apiRoutes       → @skitsaas/sdk / manifest.ts
ALLOWED legacy API router:  createModuleApiRouter      → @skitsaas/sdk/server
REQUIRED for page routes:   createModulePageRouter     → @skitsaas/sdk/server
REQUIRED for server actions: createValidatedServerActionController → @skitsaas/sdk/server
PREFERRED for typed API rate limiting: RouteApi(...).METHOD().rateLimit(...) → @skitsaas/sdk
ALLOWED legacy/standalone rate limiting: withRateLimit, checkRateLimit → @skitsaas/sdk
```

## Dispatcher Routes

Modules are served at:

- `/admin/modules/[moduleId]/[[...slug]]`
- `/dashboard/modules/[moduleId]/[[...slug]]`
- `/api/modules/[moduleId]/[[...slug]]`

Use `adminRouteAliases` / `dashboardRouteAliases` in manifest for friendly URLs.

## API Routes

```ts
// src/routes.ts
import { RouteApi } from '@skitsaas/sdk';

const BASE = '/modules/mod.<id>';

export const ModuleApiRoutes = {
  health: RouteApi(`${BASE}/health`).GET().name('mod.<id>.api.health'),
  create: RouteApi(`${BASE}/items`)
    .POST()
    .auth('admin')
    .rateLimit({ limit: 10, windowSeconds: 60 })
    .name('mod.<id>.api.items.create'),
} as const;
```

```ts
// src/manifest.ts
import { defineModule } from '@skitsaas/sdk';
import { ModuleApiRoutes } from './routes';

export default defineModule({
  moduleId: 'mod.<id>',
  version: '0.1.0',
  displayName: 'Module',
  apiRoutes: [
    ModuleApiRoutes.health.handler(() => Response.json({ ok: true })),
    ModuleApiRoutes.create.handler(async () => {
      return Response.json({ ok: true }, { status: 201 });
    }),
  ],
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
import {
  createValidatedServerActionController,
  requireUser
} from '@skitsaas/sdk/server';
import { myForm } from './forms';

const withValidatedAction = createValidatedServerActionController({
  requireUser: () => requireUser<{ id: number }>()
});

export const createItemAction = withValidatedAction(myForm, async ({ values }) => {
  // values are already validated server-side
  return { ok: true };
});
```

## Rate Limiting

```ts
import { RouteApi } from '@skitsaas/sdk';

const BASE = '/modules/mod.<id>';

export const ModuleApiRoutes = {
  create: RouteApi(`${BASE}/items`)
    .POST()
    .auth('admin')
    .rateLimit({ limit: 10, windowSeconds: 60 })
    .name('mod.<id>.api.items.create'),
} as const;
```

For legacy `createModuleApiRouter(...)` handlers or standalone handlers:

```ts
import { withRateLimit } from '@skitsaas/sdk';

const rateLimitedHandler = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  async (request, context) => Response.json({ ok: true })
);
```

## Nav Items and Route Aliases

In manifest:

```ts
adminNavItems: [{ id: 'mod.<id>.admin.nav', label: 'Items', href: '/admin/my-module' }],
adminRouteAliases: ['/admin/my-module'],
dashboardNavItems: [{ id: 'mod.<id>.dashboard.nav', label: 'Items', href: '/dashboard/my-module' }],
dashboardRouteAliases: ['/dashboard/my-module'],
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

## Subscription Feature Gates y Quota

`getDashboardFeatureController` y `getCurrentFeatureControllerByScope` son **host-only** y FORBIDDEN en módulos.

Usa el SDK quota controller (`@skitsaas/sdk/server`):

```ts
import { checkFeature, getQuotaStatus, consumeQuota, QuotaExceededError } from '@skitsaas/sdk/server';

const ctx = { teamId: user.teamId, userId: null };

// 1. Gate: verificar si la feature está habilitada y la quota no está agotada
const feature = await checkFeature('reports_daily', ctx);
if (!feature.enabled) return Response.json({ error: 'feature_not_available' }, { status: 403 });
if (feature.exhausted) return Response.json({ error: 'quota_exceeded' }, { status: 429 });

// 2. Intent-based — consumir antes de la operación (strict=true lanza QuotaExceededError)
try {
  await consumeQuota('api_calls', ctx, { strict: true });
} catch (e) {
  if (e instanceof QuotaExceededError) return Response.json({ error: 'quota_exceeded' }, { status: 429 });
  throw e;
}

// 3. Success-only — consumir solo si tuvo éxito
const result = await doWork();
if (result.ok) await consumeQuota('reports_daily', ctx);

// 4. Leer estado completo para un widget/dashboard
const quota = await getQuotaStatus('reports_daily', ctx);
// → { limit: 100, used: 47, remaining: 53, resetAt: Date }
```

**Regla de naming de feature keys**: consultar `lib/features/catalog.ts` del host para las claves disponibles.
Los feature keys de subscription son definidos por el host — si un módulo necesita una clave propia, usar `getModuleConfigValue` (config de módulo, no quota de plan).
