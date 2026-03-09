---
title: "First Steps: Multi-Service Deployment"
sidebar_position: 2
description: Split admin, dashboard/frontend, and API across separate services with configurable area base URLs and automatic CORS.
---

# First Steps: Multi-Service Deployment

S-Kit SaaS supports splitting the platform across multiple independent services. Each area (admin, dashboard, frontend, API) has a configurable base URL, so you can deploy them on separate hosts without changing any application code.

> **Starting simple?** Read [First Steps: Simple SaaS](./01-simple-saas.md) first. Come back here when you're ready to scale out.

---

## When to split services

| Scenario | Recommendation |
|----------|---------------|
| Development / early stage | Single service — simplest to operate |
| Admin must not be reachable from the public internet | Split admin to a private VPC service |
| API requires more compute than Next.js provides | Dedicated API service (Node.js, Bun, etc.) |
| Frontend needs a CDN-first edge deployment | Split frontend from server-rendered admin/dashboard |
| Compliance requires strict network isolation | Full split: each area its own service |

---

## Architecture options

### Option A: 2 services — App + Admin

The most common split. Admin is on an internal/private host; the user-facing app (dashboard + frontend) is on the public host.

```
https://app.myapp.com      → Next.js app  (dashboard + frontend)
https://admin.myapp.com    → Next.js app  (admin only)
```

Both services share the same PostgreSQL database and `AUTH_SECRET`.

### Option B: 3 services — App + Admin + API

Add a dedicated API server for high-throughput module API routes:

```
https://app.myapp.com      → Next.js app  (dashboard + frontend)
https://admin.myapp.com    → Next.js app  (admin only)
https://api.myapp.com      → API server   (module API routes)
```

The API server can be a bare Node.js/Bun HTTP server, a separate Next.js instance, or any runtime that can import `@skitsaas/sdk`.

---

## How area bases work

Every route factory (`RouteAdmin`, `RouteDashboard`, `RouteFrontend`, `RouteApi`) reads its base URL from a singleton configured at startup via `configureAreaBases()`, which is called automatically from `lib/routing/area-setup.ts` using env vars. Route objects behave as strings in any context.

**The env var value completely replaces the default path prefix.** There is no separate "host" and "prefix" — whatever you set becomes the entire base.

```ts
import { RouteAdmin, RouteApi } from '@skitsaas/sdk'

// ─── Admin area ────────────────────────────────────────────────────────────
// Default (same host):
//   areaBases.admin = '/admin'
//   RouteAdmin('/users')  →  '/admin/users'

// NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
//   areaBases.admin = 'https://admin.myapp.com'
//   RouteAdmin('/users')  →  'https://admin.myapp.com/users'
//   (no /admin path — the host is the admin domain)

// NEXT_PUBLIC_ROUTE_BASE_ADMIN=/management   (same host, custom prefix)
//   RouteAdmin('/users')  →  '/management/users'

// ─── API area ──────────────────────────────────────────────────────────────
// Default (same Next.js host):
//   areaBases.api = '/api'
//   RouteApi('/modules/mod.x/items')  →  '/api/modules/mod.x/items'

// NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api  (separate Next.js service)
//   RouteApi('/modules/mod.x/items')  →  'https://api.myapp.com/api/modules/mod.x/items'
//   fetch(String(route))  →  cross-origin fetch, CORS headers added automatically

// NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com      (bare server, routes at root)
//   RouteApi('/modules/mod.x/items')  →  'https://api.myapp.com/modules/mod.x/items'
```

> **Next.js vs bare API server**: a Next.js-based API service serves routes under `/api/` by default, so include `/api` in the base URL (`https://api.myapp.com/api`). A bare Node.js/Bun server can expose routes at any path — omit `/api` if routes are at root.

Page routes with a cross-origin base produce a hard navigation to the other host — correct for separate Next.js deployments. API routes with a cross-origin base are transparent for `fetch()`.

---

## Configuration

### Environment variables per service

Set these in the `.env` (or platform secrets) for **each** service:

#### Required on all services

```bash
POSTGRES_URL=postgresql://user:password@db-host:5432/mydb
AUTH_SECRET=your-shared-secret    # must be identical across all services
BASE_URL=https://app.myapp.com    # public URL of this specific service
```

#### Area base URLs (on the service that generates links)

```bash
# Tell this service where each area lives.
# Only the values that differ from the defaults need to be set.
# Note: the value REPLACES the default prefix entirely.
#   /admin, /dashboard, /api are removed when you supply a full URL.
#   For a Next.js API service (routes under /api/), include /api in the URL.
NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
NEXT_PUBLIC_ROUTE_BASE_DASHBOARD=https://app.myapp.com/dashboard
NEXT_PUBLIC_ROUTE_BASE_FRONTEND=https://app.myapp.com
NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api     # /api included for Next.js API service
```

`NEXT_PUBLIC_` prefix is required so these values are bundled into client-side code (used in React `<Link>` hrefs and browser `fetch()` calls).

#### Surface mode per service

Lock each service to only serve its own area:

```bash
# On the App service (dashboard + frontend only):
APP_SURFACE_MODE=dashboard-only

# On the Admin service (admin only):
APP_SURFACE_MODE=admin-only

# On the API service: no surface mode needed — API routes are always active
```

#### Team system toggle

If your SaaS does **not** use teams / organizations, disable the team system globally from env before planning `/api/team`, dashboard membership flows, or team-aware proxies:

```bash
TEAMS_ENABLED=false
```

With `TEAMS_ENABLED=false`:

- sign-up and seed stop auto-creating a default team
- dashboard users resolve as `standalone`
- `/api/team` is intentionally disabled (`404`), so you do **not** proxy or split that route
- continue the multi-service plan only with the remaining dashboard/frontend/API routes

With `TEAMS_ENABLED=true` (default):

- `/api/team` stays active
- you continue with the normal planning for proxies, CORS, and cross-service routing of authenticated dashboard APIs

#### CORS for the API service

When the API is on a separate origin, browsers will block cross-origin `fetch()` without CORS headers. Set the allowed origins on the **API service**:

```bash
# Comma-separated list of origins allowed to call the API
ROUTE_API_CORS_ORIGINS=https://app.myapp.com,https://admin.myapp.com

# Or wildcard for a fully public API:
ROUTE_API_CORS_ORIGINS=*
```

With `ROUTE_API_CORS_ORIGINS` set, `dispatchApiRoutes` automatically:
- Responds to `OPTIONS` preflight requests (HTTP 204) without invoking route handlers.
- Adds `Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`, and `Access-Control-Allow-Methods` to every API response.

No code changes required in module route handlers.

---

## Complete example: Option A (App + Admin)

### App service `.env`

```bash
POSTGRES_URL=postgresql://user:password@db:5432/mydb
AUTH_SECRET=shared-secret-value
BASE_URL=https://app.myapp.com

# Area bases — admin lives on a different host
NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
NEXT_PUBLIC_ROUTE_BASE_DASHBOARD=https://app.myapp.com/dashboard
NEXT_PUBLIC_ROUTE_BASE_FRONTEND=https://app.myapp.com

# Lock to dashboard + frontend only
APP_SURFACE_MODE=dashboard-only
```

### Admin service `.env`

```bash
POSTGRES_URL=postgresql://user:password@db:5432/mydb
AUTH_SECRET=shared-secret-value       # same value as App service
BASE_URL=https://admin.myapp.com

# Area bases — app (dashboard/frontend) is on a different host
NEXT_PUBLIC_ROUTE_BASE_DASHBOARD=https://app.myapp.com/dashboard
NEXT_PUBLIC_ROUTE_BASE_FRONTEND=https://app.myapp.com

# Lock to admin only
APP_SURFACE_MODE=admin-only
```

---

## Complete example: Option B (App + Admin + API)

### App service `.env`

```bash
POSTGRES_URL=postgresql://user:password@db:5432/mydb
AUTH_SECRET=shared-secret-value
BASE_URL=https://app.myapp.com

NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com
NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api    # /api included — API service is Next.js

APP_SURFACE_MODE=dashboard-only
```

### Admin service `.env`

```bash
POSTGRES_URL=postgresql://user:password@db:5432/mydb
AUTH_SECRET=shared-secret-value
BASE_URL=https://admin.myapp.com

NEXT_PUBLIC_ROUTE_BASE_DASHBOARD=https://app.myapp.com/dashboard
NEXT_PUBLIC_ROUTE_BASE_FRONTEND=https://app.myapp.com
NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api    # /api included — API service is Next.js

APP_SURFACE_MODE=admin-only
```

### API service `.env`

```bash
POSTGRES_URL=postgresql://user:password@db:5432/mydb
AUTH_SECRET=shared-secret-value
BASE_URL=https://api.myapp.com

# Accept requests from both app and admin origins
ROUTE_API_CORS_ORIGINS=https://app.myapp.com,https://admin.myapp.com
```

---

## Database roles per service

All services connect to the **same** PostgreSQL database, but each service should use a connection string scoped to exactly what that service needs. This is enforced via PostgreSQL Row-Level Security (RLS) and role-level GRANTs.

### Role map

| Service | Recommended role | `POSTGRES_URL` | `ADMIN_POSTGRES_URL` | Access |
|---------|-----------------|----------------|----------------------|--------|
| App (dashboard + frontend) | `saas_app` | `saas_app` connection | — (not set) | User-facing tables only; RLS enforced per `app.user_id` |
| Admin | `saas_admin` | `saas_app` connection (fallback) | `saas_admin` connection | All tables; RLS bypassed (`BYPASSRLS`) |
| API | `saas_api` *(custom)* or `saas_admin` | `saas_api` connection | — | Module tables + selected host tables; own RLS rules |

> The `saas_app` and `saas_admin` roles are created by the RLS migration (`0026_rls_setup.sql`). See [RLS Setup](../operations/rls-setup.md) for the full setup guide.

### App service — `saas_app` (RLS enforced)

The app service only needs access to user-facing tables. `saas_app` has RLS enforced — without `app.user_id` set in the query context, no user rows are returned at all.

```bash
# App service .env
POSTGRES_URL=postgresql://saas_app:password@db:5432/mydb
# ADMIN_POSTGRES_URL must NOT be present on the app service
```

All dashboard server actions that read or write user data must wrap queries in `withUserContext(user.id, ...)` to set `app.user_id` for the duration of the transaction.

### Admin service — `saas_admin` (RLS bypassed)

The admin service needs unrestricted access to all tables (users, logs, payments, configs, module tables). `adminDb` uses the `saas_admin` role which has `BYPASSRLS` and `GRANT ALL ON ALL TABLES`.

```bash
# Admin service .env
POSTGRES_URL=postgresql://saas_app:password@db:5432/mydb      # fallback for shared helpers
ADMIN_POSTGRES_URL=postgresql://saas_admin:password@db:5432/mydb
```

Keep `ADMIN_POSTGRES_URL` exclusively in the admin service environment. If it leaked to the app service, any code calling `adminDb` there would bypass RLS unintentionally.

### API service — custom `saas_api` role (recommended)

A dedicated API service needs to read and write module tables (`mod_*`) and selected host tables, but should not carry unrestricted admin access. Create a purpose-built role:

```sql
-- Run once as superuser
CREATE ROLE saas_api WITH LOGIN PASSWORD 'your-api-password';
GRANT USAGE ON SCHEMA public TO saas_api;

-- Full access to module-owned tables (modules enforce authorization at the app layer)
GRANT ALL ON ALL TABLES IN SCHEMA public TO saas_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO saas_api;

-- Or restrict to specific tables for tighter control:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mod_commerce_products TO saas_api;
-- GRANT SELECT ON users, teams, team_members TO saas_api;
```

Add RLS policies on `saas_api` when tenant isolation is required at the database level:

```sql
-- Example: tenant-scoped policy on a module table
ALTER TABLE mod_commerce_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_tenant_isolation ON mod_commerce_products
  AS PERMISSIVE FOR ALL TO saas_api
  USING (team_id = current_setting('app.team_id')::bigint);
```

The API handler then sets the tenant context before querying:

```ts
// API route handler — set team context so RLS applies
import { withTeamContext } from '@/lib/db/with-user-context'

export async function handleListProducts(req: Request, params: Record<string, string>) {
  const session = await getSession(req)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  return withTeamContext(session.teamId, async (tx) => {
    const products = await tx.select().from(modCommerceProducts)
    return Response.json({ products })
  })
}
```

```bash
# API service .env
POSTGRES_URL=postgresql://saas_api:password@db:5432/mydb
# No ADMIN_POSTGRES_URL — the API service should not need admin-level access
```

If starting simple, `saas_admin` works for the API service too (same as modules use internally via `getAdminDb()`). Move to a dedicated `saas_api` role when tenant isolation or least-privilege matters.

### Connection string map

```
App service              Admin service              API service
──────────────────────   ────────────────────────   ──────────────────────
POSTGRES_URL             POSTGRES_URL               POSTGRES_URL
= saas_app               = saas_app (fallback)      = saas_api
                         ADMIN_POSTGRES_URL
                         = saas_admin
```

### Database setup

Run migrations and seed **once** from any service:

```bash
pnpm db:migrate
pnpm db:seed
```

Run the RLS migration once (as superuser) to create the `saas_app` and `saas_admin` roles:

```bash
psql "$SUPERUSER_POSTGRES_URL" -f lib/db/migrations/0026_rls_setup.sql
```

After that, set role passwords and build your connection strings — see [RLS Setup Steps 2–3](../operations/rls-setup.md).

Only the primary service (usually App) needs to run `modules:sync` to register module state. If running separate build pipelines, ensure `pnpm modules:migrate && pnpm modules:sync` runs once per deployment.

---

## Module API routes and cross-origin paths

Module `routes.ts` files define paths relative to the API base. When the API base changes, all route URLs update automatically — no module code needs to change:

```ts
// modules/mod.x/src/routes.ts
import { RouteApi } from '@skitsaas/sdk'

const BASE = '/modules/mod.x'   // relative to API base — no host prefix

export const ModXRoutes = {
  items: {
    list:   RouteApi(`${BASE}/items`).GET().auth('user').name('mod.x.api.items.list'),
    create: RouteApi(`${BASE}/items`).POST().auth('admin').name('mod.x.api.items.create'),
  }
}

// With NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api (separate Next.js API service):
// String(ModXRoutes.items.list) → 'https://api.myapp.com/api/modules/mod.x/items'
// fetch(String(ModXRoutes.items.list)) → cross-origin fetch, CORS headers added automatically
```

---

## Deployment checklist

- [ ] `AUTH_SECRET` is identical across all services
- [ ] `POSTGRES_URL` points to the same database on all services
- [ ] `NEXT_PUBLIC_ROUTE_BASE_*` is set correctly on every service (especially on services that generate cross-area links)
- [ ] `APP_SURFACE_MODE` restricts each service to its own area
- [ ] `ROUTE_API_CORS_ORIGINS` is configured on the API service listing all client origins
- [ ] Firewall/network rules block direct public access to the Admin service (if it should be internal-only)
- [ ] `pnpm db:migrate` has been run on the shared database before deploying any service
- [ ] `pnpm build` passes without errors on all services

---

## Further reading

- [Environment Variables Reference](../core/env-variables.md) — full variable list with defaults
- [Routing System](../core/routing-system.md) — how `configureAreaBases()` and `configureApiCors()` work internally
- [Deployment Surface Mode](../core/env-variables.md#deployment-surface-mode) — `APP_SURFACE_MODE` details
- [Security Architecture](../core/security.md) — session handling across services
