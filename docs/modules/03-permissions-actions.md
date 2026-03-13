---
title: Permissions and Actions
sidebar_position: 3
---

# Permissions and Actions

## Admin pages

Admin dispatcher uses `requireAdminAccess()` before resolving the module. This ensures:

- user is authenticated
- user satisfies `enrichUser(user).isAdmin()`

In the current default host config that means global `users.role='admin'`.
If your deployment customizes `adminAreaRoles`, the dispatcher follows that config.

If you need extra checks (team membership, feature flags, plan gates), enforce inside the module handler.

## Dashboard pages

Dashboard dispatcher only checks `getUser()` and redirects to `/login` if missing. It does **not** enforce roles or team membership.

If your module requires:

- team membership
- specific roles
- subscription features

Validate inside the module handler or in a shared helper.

## API modules

API dispatcher does **not** apply a blanket guard by itself. Access is defined by
the module contract you choose:

- preferred: typed `apiRoutes` entries with `RouteApi(...).auth('user' | 'admin')`
- legacy: `apiHandler` created with `createModuleApiRouter(...)`

Example:

```ts
import { RouteApi } from '@skitsaas/sdk';

const AdminSyncRoute = RouteApi('/modules/mod.analytics/admin-sync')
  .POST()
  .auth('admin')
  .name('mod.analytics.api.admin-sync');

export const apiRoutes = [
  AdminSyncRoute.handler(() => Response.json({ ok: true }))
];
```

For custom permission checks (ownership, team membership, quotas), use
route `.proxy([...])`, legacy `canAccess`, or validate directly in `handler`.

## Server actions

**For modules**, use `createValidatedServerActionController` from `@skitsaas/sdk/server`:

```ts
'use server'
import { createValidatedServerActionController } from '@skitsaas/sdk/server'
import { myItemForm } from './forms'

const controller = createValidatedServerActionController(myItemForm)

export const createMyItemAction = controller.action(async ({ values }) => {
  // values are validated; handle the mutation here
  return { ok: true }
})
```

**For core host pages** (not modules), the existing wrappers remain available:
- Admin: `adminAction` from `app/(dashboard)/admin/controller.ts`
- Dashboard: `dashboardAction` from `app/(dashboard)/dashboard/controller.ts`

## Rate limiting

Apply rate limiting to module API handlers using `withRateLimit` from `@skitsaas/sdk`. Do **not** import from `@/lib/routing/rate-limit` in module code.

```ts
import { withRateLimit } from '@skitsaas/sdk'

// Simple per-IP limit
const rateLimitedHandler = withRateLimit(
  { limit: 10, windowSeconds: 60 },
  async (request) => Response.json({ ok: true })
)
```

For per-plan limits see `docs/proxies/02-security.md`.

## Recommendation

For each module create a small `actions.ts` file and use `createValidatedServerActionController` for mutations. Apply `withRateLimit` from SDK on API routes that need limiting.
