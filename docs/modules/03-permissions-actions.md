---
title: Permissions and Actions
sidebar_position: 3
---

# Permissions and Actions

## Admin pages

Admin dispatcher uses `requireAdminAccess()` before resolving the module. This ensures:

- user is authenticated
- user role is `owner` or `admin`

If you need extra checks (team membership, feature flags, plan gates), enforce inside the module handler.

## Dashboard pages

Dashboard dispatcher only checks `getUser()` and redirects to `/login` if missing. It does **not** enforce roles or team membership.

If your module requires:

- team membership
- specific roles
- subscription features

Validate inside the module handler or in a shared helper.

## API modules

API dispatcher does **not** apply any guard. You must authenticate in `apiHandler`.

Example:

```ts
import { createModuleApiRouter } from '@skitsaas/sdk/server';

export const apiHandler = createModuleApiRouter({
  routes: [
    {
      method: 'POST',
      path: '/admin-sync',
      auth: 'admin',
      handler: () => Response.json({ ok: true })
    }
  ]
});
```

For custom permission checks (ownership, team membership, quotas), use
`canAccess` or validate directly in `handler`.

## Server actions

Prefer the existing action wrappers:

- Admin: `adminAction` from `app/(dashboard)/admin/controller.ts`
- Dashboard: `dashboardAction` from `app/(dashboard)/dashboard/controller.ts`

These provide:

- centralized auth
- FormData parsing helpers
- optional revalidation

## Recommendation

For each module create a small `actions.ts` file inside a module folder (not currently enforced by codebase) and wrap any mutations with `adminAction` or `dashboardAction`.
