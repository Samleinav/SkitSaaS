---
title: "RLS And Tenant Isolation"
sidebar_position: 0
---

# RLS And Tenant Isolation

Use this page when the task depends on who is allowed to read or write tenant
data at the database layer.

## Main Model

SkitSaaS distinguishes between:

- user-scoped dashboard and frontend operations
- admin-scoped backoffice operations

That split matters both in route guards and in database access patterns.

## Admin Versus User DB Path

Current host model:

- admin-oriented reads and writes can use `adminDb`
- tenant-aware dashboard/frontend writes should use `withUserContext(...)`

Relevant files:

- `lib/db/drizzle.ts`
- `lib/db/with-user-context.ts`
- `lib/db/queries.admin.ts`
- `lib/db/migrations/0026_rls_setup.sql`

## Why This Exists

RLS and user context are what keep dashboard/frontend server actions from
behaving like unrestricted admin code.

Without that split, a "normal" server action can accidentally become a tenant
escape hatch.

## Dashboard And Frontend Rule

For tenant-aware writes in dashboard or frontend flows:

- prefer the user-scoped DB path
- do not treat `adminDb` as the default
- assume business permissions are not enough by themselves

## Admin Rule

Admin surfaces are intentionally different:

- `/admin` is global-admin territory
- admin pages and admin queries can use the admin-oriented DB path
- admin access still needs explicit route and action guards

## Auth Actions Exception

Some auth flows necessarily happen before a stable user context exists.

Examples:

- sign-in
- sign-up
- password-reset

Those flows cannot rely on a known tenant-bound user context in the same way as
dashboard mutations.

## Module Rule

For module code:

- `source-package` modules should use SDK server adapters such as `getDb()` and
  `getAdminDb()`
- portable modules should not import host DB internals directly
- tenant-aware logic still needs a clean separation between admin reads and
  user-scoped operations

## Verification Mindset

When reviewing a tenant-sensitive change, verify:

1. which route area owns the request
2. whether the action is admin or tenant-facing
3. which DB path is used
4. whether business permissions and DB isolation align

## Common Mistakes

- using `adminDb` in dashboard code because it is convenient
- treating route guards as a replacement for DB isolation
- documenting only UI permissions and forgetting the DB path

## Related Docs

- `../proxies-and-api-security.md`
- `../request-lifecycle.md`
- `../modules-and-sdk-boundaries.md`
