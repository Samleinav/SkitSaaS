---
title: Route Factories and Registry
description: RouteAdmin, RouteDashboard, RouteFrontend, RouteApi — typed route factories, named registry, core/routes.ts, and module routes.ts.
sidebar_position: 2
---

# Routing System

Status: Production-ready
Last review: 2026-03-10

This document describes the `RouteBuilder` system — a Laravel-inspired typed route registry with composable per-route proxy chains built into `@skitsaas/sdk`.

## Why this exists

Before this system, routes were raw strings scattered across pages and modules. `proxy.ts` had inline auth logic, with no per-route configurability. There was no named registry so building a URL meant remembering or grepping for the string.

The route system replaces that with:

- typed route objects that behave as strings (no property access errors caught at build time)
- a global named registry à la Laravel's `route('admin.users')`
- composable proxy chains per route
- a single `core/routes.ts` as source of truth for all core routes
- SDK-first so modules use the same factories

## Core files

| File | Role |
|------|------|
| `app/sdk/src/routing/types.ts` | Base types |
| `app/sdk/src/routing/registry.ts` | Global named registry + `route()` helper |
| `app/sdk/src/routing/builder.ts` | `RouteBuilder` class (page routes) |
| `app/sdk/src/routing/api-route.ts` | `ApiRouteBuilder`, `ApiMethodRouteBuilder`, `dispatchApiRoutes` |
| `app/sdk/src/routing/area.ts` | Area factories + `configureAreaDefaults()` |
| `app/sdk/src/routing/matcher.ts` | Proxy chain resolution for `proxy.ts` |
| `lib/routing/proxies.ts` | Host proxy implementations (DB-aware) |
| `lib/routing/area-setup.ts` | Side-effect: injects `proxyAdmin`/`proxyAuth` + `proxyApiAdmin`/`proxyApiAuth` into SDK |
| `lib/routing/all-routes.ts` | Entry point imported by `proxy.ts` — registers all routes |
| `lib/routing/with-api-proxy.ts` | Wrapper for standalone Next.js API route handlers |
| `core/routes.ts` | All core named routes |

## Route areas

Four areas are available from `@skitsaas/sdk`:

| Factory | Default prefix | Default proxies |
|---------|----------------|----------------|
| `RouteAdmin(path)` | `/admin` | `proxyAdmin` (session + DB admin/owner role) |
| `RouteDashboard(path)` | `/dashboard` | `proxyAuth` (session + DB active user) |
| `RouteFrontend(path)` | *(none)* | none |
| `RouteApi(path)` | `/api` | none — use `.GET()/.POST()/.auth()` on the returned `ApiRouteBuilder` |

Default proxies for `RouteAdmin` and `RouteDashboard` are injected at startup by `lib/routing/area-setup.ts` via `configureAreaDefaults()`. API auth proxies (`proxyApiAuth`/`proxyApiAdmin`) are injected via `configureApiAuthProxies()` in the same file. The SDK itself has no direct dependency on `@/lib/db/*`.

All four prefix defaults are configurable via `configureAreaBases()` — see [Multi-service deployments](#multi-service-deployments) below.

## Multi-service deployments

By default every area is served from the same Next.js host. In larger deployments you can split areas across separate origins — e.g. API on a dedicated Node.js server, admin on a separate app.

### How it works

`lib/routing/area-setup.ts` calls `configureAreaBases()` with values read from env vars. Route builders then produce fully qualified URLs when the base is an origin:

```ts
// .env
// NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com

// routes.ts (module)
RouteApi('/modules/mod.x/items').GET()   // path: 'https://api.myapp.com/modules/mod.x/items'

// fetch() — transparent, cross-origin works normally
fetch(String(ApiRoutes.items.list))

// <Link> with admin cross-origin base — hard navigates to other host (correct for split apps)
// NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
<Link href={String(Routes.admin.users)} />   // href="https://admin.myapp.com/users"
```

### Env vars

| Variable | Default | Example override |
|----------|---------|-----------------|
| `NEXT_PUBLIC_ROUTE_BASE_ADMIN` | `/admin` | `https://admin.myapp.com` |
| `NEXT_PUBLIC_ROUTE_BASE_DASHBOARD` | `/dashboard` | `https://app.myapp.com/dashboard` |
| `NEXT_PUBLIC_ROUTE_BASE_FRONTEND` | *(empty)* | `https://app.myapp.com` |
| `NEXT_PUBLIC_ROUTE_BASE_API` | `/api` | `https://api.myapp.com` |
| `ROUTE_API_CORS_ORIGINS` | *(empty — CORS off)* | `https://app.myapp.com,https://admin.myapp.com` |

`NEXT_PUBLIC_` prefix is required so base URLs are available in client-side React components (Link hrefs, fetch calls).

### CORS

When the API is on a separate origin, browsers will block cross-origin `fetch()` calls without CORS headers. Set `ROUTE_API_CORS_ORIGINS` to enable automatic CORS handling in `dispatchApiRoutes`:

- `OPTIONS` preflight requests are answered immediately (HTTP 204) — route handlers are not invoked.
- `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, and `Access-Control-Allow-Methods` are added to every API response whose `Origin` header matches.
- Use `*` for a fully public API with no per-origin restriction.

```bash
# Specific origins
ROUTE_API_CORS_ORIGINS=https://app.myapp.com,https://admin.myapp.com

# Fully public
ROUTE_API_CORS_ORIGINS=*
```

You can also call `configureApiCors()` directly from `lib/routing/area-setup.ts` for programmatic control (e.g. reading origins from a DB config at startup).

## RouteBuilder API

```ts
import { RouteAdmin, RouteDashboard, RouteFrontend, RouteApi } from '@skitsaas/sdk'

// Basic route — behaves as a string
RouteAdmin('/users')                    // "/admin/users"
String(RouteAdmin('/users'))            // "/admin/users"

// Named registration
RouteAdmin('/users').name('admin.users')

// Parameterized
RouteAdmin('/users/{id}/edit').name('admin.user.edit')
// → route('admin.user.edit', { id: 5 }) === "/admin/users/5/edit"

// Extra proxies on top of area default
import { proxyFeatureFlag } from '@/lib/routing/proxies'
RouteAdmin('/premium')
  .proxy([proxyFeatureFlag('premium')])
  .name('admin.premium')
// chain: proxyAdmin → proxyFeatureFlag

// Interpolate params inline
Routes.admin.orders.edit.with({ orderId: 42 })   // "/admin/orders/42/edit"
```

`.proxy()` always returns a **new immutable instance** — it never mutates the original.

## String coercion

`RouteBuilder` implements `toString()`, `valueOf()`, and `[Symbol.toPrimitive]()`, so it works transparently as a string:

```tsx
// JSX href
<Link href={Routes.admin.users} />

// Template literal
const url = `${Routes.admin.users}?page=2`

// String comparison
String(Routes.admin.users) === '/admin/users'  // true

// TypeScript catches typos at build time
Routes.admin.userss  // ❌ Property 'userss' does not exist
```

## Named registry — `route()`

```ts
import { route } from '@skitsaas/sdk'

route('admin.users')                       // "/admin/users"
route('admin.user.edit', { id: 5 })        // "/admin/users/5/edit"
route('example.admin.edit', { id: 5 })     // "/admin/custom/example-suite/edit/5"
route('no.existe')                         // throws RouteNotFoundError at runtime
```

`route()` is safe to use in server components, client components, and server actions — it only reads from the in-memory registry.

## Core routes

All core routes are registered in `core/routes.ts`:

```ts
import { Routes } from '@/core/routes'

Routes.admin.home                          // "/admin"
Routes.admin.users                         // "/admin/users"
Routes.admin.subscriptions.templates.edit            // "/admin/subscriptions/templates/{templateId}/edit"
Routes.admin.subscriptions.templates.edit.with({ templateId: 3 })  // "/admin/subscriptions/templates/3/edit"
Routes.dashboard.subscriptions             // "/dashboard/subscriptions"
Routes.frontend.pricing                    // "/pricing"
```

### When to register in `core/routes.ts`

Register routes that are:

- linked from multiple places
- need per-route proxy extras via `.proxy([...])`
- worth a stable name for `route('admin.something')`

Skip registration (build URLs inline) for:

- parameterized sub-routes used only in one place
- `RouteAdmin('/users').with({ id })` called directly at use site

## Module routes

Each module defines its own routes file. Modules import only from `@skitsaas/sdk` — no `@/lib/` imports needed.

```ts
// modules/mod.my-feature/src/routes.ts — same for source-host and source-package
import { RouteAdmin, RouteDashboard, RouteApi } from '@skitsaas/sdk'

const ADMIN_BASE = '/custom/my-feature'
const API_BASE = '/api/modules/mod.my-feature'

// Page routes (admin + dashboard)
export const MyFeatureRoutes = {
  admin: {
    home:   RouteAdmin(ADMIN_BASE).name('my-feature.admin.home'),
    create: RouteAdmin(`${ADMIN_BASE}/create`).name('my-feature.admin.create'),
    edit:   RouteAdmin(`${ADMIN_BASE}/edit/{id}`).name('my-feature.admin.edit'),
  },
  dashboard: {
    home: RouteDashboard(ADMIN_BASE).name('my-feature.dashboard.home'),
  },
} as const

// API routes — metadata only, handlers attached in manifest.ts
export const MyFeatureApiRoutes = {
  list:   RouteApi(`${API_BASE}/items`).GET().auth('user').name('my-feature.api.items.list'),
  create: RouteApi(`${API_BASE}/items`).POST().auth('admin').name('my-feature.api.items.create'),
  get:    RouteApi(`${API_BASE}/items/{id}`).GET().auth('user').name('my-feature.api.items.get'),
  delete: RouteApi(`${API_BASE}/items/{id}`).DELETE().auth('admin').name('my-feature.api.items.delete'),
} as const
```

Module routes do **not** need to import `area-setup`. The host runs it via `all-routes.ts → core/routes.ts` before any module routes are evaluated.

To include a module's proxy chains in `proxy.ts`, add the import to `lib/routing/all-routes.ts`:

```ts
// lib/routing/all-routes.ts
import '@/core/routes'
import '@/../modules/mod.my-feature/src/routes'  // add this line
```

## Proxy chain architecture

### How proxy.ts resolves chains

1. `proxy.ts` imports `lib/routing/all-routes.ts` at startup — populates the global registry.
2. On each request, `matchRouteProxyChain(pathname)` does a longest-prefix match against registered routes.
3. Returns the matched route's `allProxies` (area defaults + per-route extras).
4. Falls back to area defaults (`/admin/*` → `[proxyAdmin]`, `/dashboard/*` → `[proxyAuth]`) if no named route matches.

This means every unregistered admin/dashboard path is still protected by the area default.

### Proxy function contract

```ts
type RouteProxyFn = (request: NextRequest) => Promise<NextResponse | null>
// null  → continue to the next proxy in the chain
// Response → short-circuit (redirect, 401, 403, etc.)
```

### Available host proxies

| Proxy | Use | Auth failure |
|-------|-----|--------------|
| `proxyAdmin` | Page routes needing admin/owner session | Redirect `/admin/login` |
| `proxyAuth` | Page routes needing any active session | Redirect `/sign-in` |
| `proxyApiAdmin` | API routes needing admin/owner session | `403 Forbidden` JSON |
| `proxyApiAuth` | API routes needing any active session | `401 Unauthorized` JSON |

All four live in `lib/routing/proxies.ts`.

### Per-route extra proxies

```ts
// Route that needs admin + feature flag check
RouteAdmin('/custom/premium-feature')
  .proxy([proxyFeatureFlag('premium')])
  .name('admin.premium')

// Route that needs auth + file-access check
RouteDashboard('/files')
  .proxy([proxyFiles])
  .name('dashboard.files')
```

The chain runs left to right: `proxyAdmin → proxyFeatureFlag`. The first proxy to return a non-null response short-circuits.

## API route protection

### Module API routes — typed builder (preferred)

For module API routes, use the `ApiMethodRouteBuilder` pattern. `RouteApi('/path')` now returns an `ApiRouteBuilder` with HTTP method factories:

**`routes.ts` — metadata only, edge-safe (no handler imports):**

```ts
import { RouteApi } from '@skitsaas/sdk'

const BASE = '/api/modules/mod.my-feature'

export const MyFeatureApiRoutes = {
  list:   RouteApi(`${BASE}/items`).GET().auth('user').name('my-feature.api.items.list'),
  create: RouteApi(`${BASE}/items`).POST().auth('admin')
            .rateLimit({ limit: 10, windowSeconds: 60 }).name('my-feature.api.items.create'),
  get:    RouteApi(`${BASE}/items/{id}`).GET().auth('user').name('my-feature.api.items.get'),
  update: RouteApi(`${BASE}/items/{id}`).PUT().auth('admin').name('my-feature.api.items.update'),
  delete: RouteApi(`${BASE}/items/{id}`).DELETE().auth('admin').name('my-feature.api.items.delete'),
} as const
```

**`manifest.ts` — attach handlers (Node.js only):**

```ts
import { MyFeatureApiRoutes } from './routes'
import { listItems, createItem, getItem, updateItem, deleteItem } from './handlers'

defineModule({
  moduleId: 'mod.my-feature',
  apiRoutes: [
    MyFeatureApiRoutes.list.handler(listItems),
    MyFeatureApiRoutes.create.handler(createItem),
    MyFeatureApiRoutes.get.handler(getItem),           // params.id available
    MyFeatureApiRoutes.update.handler(updateItem),
    MyFeatureApiRoutes.delete.handler(deleteItem),
  ]
})
```

Handler signature:

```ts
type ApiHandlerFn = (
  request: Request,
  params: Record<string, string>   // path params extracted from {id} etc.
) => Response | Promise<Response>
```

**Proxy execution order** per matched route:

```
1. rateLimit proxy   — cheapest, no auth dependency
2. auth proxy        — session/JWT check (injected via configureApiAuthProxies)
3. extra proxies     — feature flags, custom guards (via .proxy([...]))
4. handler
```

**Auth levels** map to host proxies configured in `lib/routing/area-setup.ts`:

| `.auth(level)` | Proxy used | Failure response |
|----------------|------------|-----------------|
| `'none'` (default) | — | — |
| `'user'` | `proxyApiAuth` | `401 Unauthorized` JSON |
| `'admin'` | `proxyApiAdmin` | `403 Forbidden` JSON |

**Per-plan rate limiting:**

```ts
RouteApi(`${BASE}/export`).POST()
  .auth('user')
  .rateLimit({
    key: (ctx) => `${ctx.userId ?? ctx.ip}:export`,
    limit: (ctx) => ({ pro: 100, free: 5 }[ctx.plan ?? 'free'] ?? 5),
    windowSeconds: 3600,
    resolveContext: async (req) => {
      const user = await getUser()
      const plan = await getUserPlan(user?.id)
      return { plan }
    }
  })
  .name('my-feature.api.export')
```

**Custom proxy extras** (feature flags, quota checks):

```ts
RouteApi(`${BASE}/premium`).POST()
  .auth('admin')
  .proxy([proxyFeatureFlag('premium'), proxyQuota('writes')])
  .name('my-feature.api.premium')
```

### Standalone Next.js API routes — typed core API bridge files

For core host API routes that live directly in `app/api/`, use the same
`RouteApi(...).METHOD().auth().proxy().name()` metadata flow used by modules.
Keep `core/api-routes.ts` edge-safe (metadata only), and attach handlers
directly inside each `app/api/*/route.ts` bridge file via `.handler(fn)`:

```ts
// core/api-routes.ts — metadata only, edge-safe (no handler imports)
import { RouteApi } from '@skitsaas/sdk'

export const CoreApiRoutes = {
  users: {
    list: RouteApi('/admin/users').GET().auth('admin').name('api.admin.users.list'),
  },
} as const
```

```ts
// app/api/admin/users/route.ts — bridge file (handler lives here, not in a shared entries file)
import { CoreApiRoutes } from '@/core/api-routes'
import { withApiRouteEntries } from '@/lib/routing/with-api-route'
import { listUsers } from '@/lib/db/queries'

export const GET = withApiRouteEntries(
  CoreApiRoutes.users.list.handler(async () => Response.json(await listUsers()))
)
```

Handlers attach at the bridge file level, not in a shared intermediate file.
Next.js code-splits naturally per `route.ts`, so a single `core/api-entries.ts`
with all handlers would eagerly pull every dependency into every bridge file.
Keep metadata in `core/api-routes.ts` and handlers in their respective bridge files.

`dispatchApiRoutes()` executes the full API chain per entry:
`rateLimit → auth → extra proxies → handler`.

When a route needs a guard that runs before the route entry chain (e.g. a
feature-flag check), pass it as `preDispatch`:

```ts
// app/api/team/route.ts — preDispatch short-circuits before auth/handler
import { CoreApiRoutes } from '@/core/api-routes'
import { proxyApiTeamsEnabled } from '@/lib/routing/proxies'
import { withApiRouteEntries } from '@/lib/routing/with-api-route'
import { getTeamForUser } from '@/lib/db/queries'

export const GET = withApiRouteEntries(
  CoreApiRoutes.team.get.handler(async () => Response.json(await getTeamForUser())),
  { preDispatch: [proxyApiTeamsEnabled] }
)
```

`withApiProxy` remains available as a lightweight fallback for one-off handlers
that do not need the typed route metadata flow (e.g. internal health checks).

Only add a new entry to `CoreApiRoutes` when the corresponding bridge file is
also migrated to `withApiRouteEntries`. Avoid intermediate states where a named
route exists in `CoreApiRoutes` but its bridge file still uses a raw handler.

## Registering API routes in `core/routes.ts`

Register API routes under `Routes.api` when they need a named reference from other parts of the app:

```ts
import { RouteApi } from '@skitsaas/sdk'

export const Routes = {
  // ...existing admin/dashboard/frontend...
  api: {
    formValidate: RouteApi('/forms/validate').POST().name('api.forms.validate'),
    users: {
      list: RouteApi('/admin/users').GET().name('api.admin.users.list'),
    },
  }
} as const
```

`RouteApi` routes are not processed by `proxy.ts`, but they are fully usable for
core API dispatch through `dispatchApiRoutes()` and `withApiRouteEntries()`.

## Import ordering rule

**ES module evaluation order is critical** in `core/routes.ts`. Static imports are hoisted and evaluated in declaration order. `area-setup` must be the first import there so `proxyAdmin`/`proxyAuth` are injected before any `RouteAdmin()`/`RouteDashboard()` call runs:

```ts
// core/routes.ts — MUST be first
import '@/lib/routing/area-setup'
import { RouteAdmin, RouteDashboard } from '@skitsaas/sdk'
```

Module `routes.ts` files do **not** need this. `lib/routing/all-routes.ts` imports `core/routes.ts` first, so by the time any module's routes.ts is evaluated, area defaults are already configured.

## TypeScript type safety

Because `Routes` is declared `as const` and route objects are typed `RouteBuilder`, accessing a non-existent property fails at compile time:

```ts
Routes.admin.userss           // ❌ TS error: Property 'userss' does not exist
Routes.admin.subscriptions.homee  // ❌ TS error
Routes.admin.users            // ✅ RouteBuilder "/admin/users"
```

`route('name')` is runtime-only validation (TypeScript cannot type-check arbitrary strings). Mistyped names throw `RouteNotFoundError` at runtime.

## Checklist — adding a new named route

**Page routes (admin / dashboard / frontend):**

1. Choose `RouteAdmin`, `RouteDashboard`, or `RouteFrontend`.
2. Add to `core/routes.ts` (core) or `modules/<id>/src/routes.ts` (module — SDK only, no `@/lib/` imports).
3. Call `.name('area.section.action')` — use dotted namespacing.
4. If the route needs extra proxies (feature flags, etc.), chain `.proxy([...])` before `.name()`.
5. For modules: add the import to `lib/routing/all-routes.ts` so proxy chains are registered.
6. Use `Routes.area.section` in JSX hrefs — never hardcode strings.

**API routes (module):**

1. Use `RouteApi('/api/modules/<moduleId>/path').GET()` (or `.POST()`, `.PUT()`, etc.).
2. Chain `.auth('user' | 'admin')`, `.rateLimit({...})`, `.proxy([...])` as needed.
3. Call `.name('mod.x.api.section.action')` for named URL access.
4. Add to `modules/<id>/src/routes.ts` (routes.ts is edge-safe — no handler imports).
5. Attach handlers in `manifest.ts`: `apiRoutes: [ MyApiRoutes.list.handler(fn), ... ]`.

**API routes (core host standalone):**

1. Add route metadata to `core/api-routes.ts` with `RouteApi('/path').METHOD().auth().rateLimit().proxy().name(...)`.
2. Attach the handler **directly in the bridge file** `app/api/*/route.ts` via `CoreApiRoutes.*.handler(fn)`.
3. Export using `withApiRouteEntries(entry, { preDispatch: [...] })` — omit `preDispatch` if no pre-auth guards are needed.
4. Only add to `CoreApiRoutes` when the bridge file is also on the dispatcher. Do not register metadata for routes whose bridge files still use raw handlers.
5. Use `withApiProxy(...)` only for simple one-off handlers that do not need typed route metadata.
