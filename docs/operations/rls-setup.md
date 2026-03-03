---
title: Row-Level Security (RLS) Setup
sidebar_position: 9
description: Configure PostgreSQL RLS and dual database roles for split admin/app deployments.
---

# Row-Level Security (RLS) Setup

This guide covers how to activate PostgreSQL Row-Level Security so that:

- Dashboard and frontend queries are automatically scoped to the authenticated user's rows.
- The `/admin` deployment uses a privileged role that bypasses RLS and can read all data.

## Architecture overview

Two Drizzle clients are exported from `lib/db/drizzle.ts`:

| Client | Role | Access |
| --- | --- | --- |
| `db` | `saas_app` | User-facing tables only; RLS enforced per `app.user_id` |
| `adminDb` | `saas_admin` | All tables; RLS bypassed (`BYPASSRLS`) |

At runtime, `db` is wired to `POSTGRES_URL` and `adminDb` is wired to `ADMIN_POSTGRES_URL`
(falls back to `POSTGRES_URL` in local dev where a single role is used).

```
Frontend / Dashboard deploy     Admin deploy
─────────────────────────────   ──────────────────────────
POSTGRES_URL → saas_app role    ADMIN_POSTGRES_URL → saas_admin role
  RLS: on, per user_id              RLS: bypassed
  Tables: user-facing only          Tables: all (including logs, payments, configs)
```

## Step 1 — Run the migration

The migration `lib/db/migrations/0026_rls_setup.sql` creates the roles, grants, and RLS
policies. It must be run **once** against the target database.

### On Supabase (or any managed Postgres)

The `CREATE ROLE` blocks require `SUPERUSER` or `CREATEROLE`. On Supabase:

1. Open the **SQL Editor** in the Supabase dashboard.
2. Connect as the `postgres` (superuser) role.
3. Run the full contents of `0026_rls_setup.sql`.

### On self-hosted Postgres

Connect as a superuser and run the file:

```bash
psql "$POSTGRES_URL" -f lib/db/migrations/0026_rls_setup.sql
```

### What the migration does

1. Creates role `saas_app` (password-authenticated, no superuser).
2. Creates role `saas_admin` (password-authenticated, `BYPASSRLS`).
3. Grants `USAGE` on the `public` schema and all sequences to both roles.
4. Grants `ALL` on all tables to `saas_admin`.
5. Grants `SELECT, INSERT, UPDATE, DELETE` on user-facing tables to `saas_app`:
   - `users`, `teams`, `team_members`, `activity_logs`, `auth_sessions`,
     `subscription_assignments`, `subscription_templates`, `subscription_template_features`,
     `payment_orders`, `password_reset_tokens`
6. Grants `SELECT`-only on `app_configs`, `subscription_templates`,
   `subscription_template_features` to `saas_app`.
7. Enables RLS on `users`, `team_members`, `activity_logs`, `auth_sessions`.
8. Creates one permissive policy per table that restricts reads/writes to rows where the
   user-ID column equals `current_setting('app.user_id')`.

## Step 2 — Set the database passwords

After creating the roles, update their passwords (the migration uses placeholder values):

```sql
ALTER ROLE saas_app  PASSWORD 'your-strong-app-password';
ALTER ROLE saas_admin PASSWORD 'your-strong-admin-password';
```

Store the passwords securely (e.g. in your secrets manager or Supabase secrets).

## Step 3 — Build the connection strings

Construct two separate connection URLs:

```
# App role — used by dashboard + frontend
POSTGRES_URL=postgresql://saas_app:your-strong-app-password@host:5432/dbname

# Admin role — used exclusively by the /admin deployment
ADMIN_POSTGRES_URL=postgresql://saas_admin:your-strong-admin-password@host:5432/dbname
```

On Supabase the host is the pooler or direct connection endpoint found under
**Project Settings → Database**.

## Step 4 — Configure environment variables per deployment

### Dashboard + Frontend deployment

```bash
POSTGRES_URL=postgresql://saas_app:...@host:5432/dbname
# ADMIN_POSTGRES_URL must NOT be set (or omitted) here
```

### Admin deployment

```bash
POSTGRES_URL=postgresql://saas_app:...@host:5432/dbname   # fallback for shared helpers
ADMIN_POSTGRES_URL=postgresql://saas_admin:...@host:5432/dbname
```

`adminDb` in `lib/db/drizzle.ts` reads `ADMIN_POSTGRES_URL` first and falls back to
`POSTGRES_URL` only when it is not set. Keep `ADMIN_POSTGRES_URL` **only** in the admin
deployment's environment.

## Step 5 — Use `withUserContext` in dashboard server actions

All dashboard server actions that write or read user-scoped rows must set the RLS context
before executing queries. Use the `withUserContext` helper from `lib/db/with-user-context.ts`:

```ts
import { withUserContext } from '@/lib/db/with-user-context';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function updateDisplayName(name: string) {
  const user = await getUser();            // reads session
  if (!user) throw new Error('Unauthorized');

  return withUserContext(user.id, (tx) =>
    tx.update(users).set({ name }).where(eq(users.id, user.id))
  );
}
```

`withUserContext` opens a transaction and calls:

```sql
SELECT set_config('app.user_id', '<userId>', true)
```

The `true` third argument makes the setting **local to the transaction**, so it cannot
leak between concurrent requests.

### Auth actions (sign-in, sign-up, password-reset)

These actions run before a session exists, so no `user_id` is known. They use `adminDb`
directly (or a privileged helper) because the `saas_app` RLS policies would block them.
This is intentional and safe — sign-in/sign-up do not expose other users' data.

## Step 6 — Admin queries use `adminDb`

All `ForAdmin` query functions in `lib/db/queries.admin.ts` already use `adminDb`.
No `withUserContext` call is needed in admin server actions because `saas_admin` bypasses RLS.

```ts
// Admin page — no withUserContext needed
import { getAllUsersForAdmin } from '@/lib/db/queries.admin';

const users = await getAllUsersForAdmin({ page: 1, limit: 50 });
```

## Module queries

All modules access the database through `getAdminDb()` from `@skitsaas/sdk/server`.

**Why not `getDb()`?**

Module-owned tables (`mod_commerce_products`, `mod_example_suite_items`, etc.) are
created by module migrations. The `saas_app` role only has grants on specific
named host tables — it has no access to module tables. Using `getDb()` in a module
would result in `permission denied` errors at runtime.

`getAdminDb()` returns `adminDb` (`saas_admin` role), which has `ALL` on all tables
via `GRANT ALL ON ALL TABLES IN SCHEMA public TO saas_admin`.

**Authorization in modules** is enforced at the application level by the module's
own query conditions — not by RLS:

```ts
// module data.ts
import { getAdminDb } from '@skitsaas/sdk/server';

function getDb() {
  return getAdminDb<any>(); // full access — module applies own WHERE conditions
}
```

When a module joins host tables that have RLS (e.g. `team_members` in a checkout
flow), using `adminDb` is also correct since the module's WHERE clause enforces
the access boundary itself.

`getDb()` in modules is only appropriate for advanced user-scoped patterns where
`withUserContext` is explicitly in the call chain — not required by default.

## Verification

After deployment, run these checks:

### 1 — Confirm roles exist

```sql
SELECT rolname, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname IN ('saas_app', 'saas_admin');
```

Expected output:

```
  rolname   | rolbypassrls | rolcanlogin
------------+--------------+-------------
 saas_admin | t            | t
 saas_app   | f            | t
```

### 2 — Confirm RLS is enabled on user-scoped tables

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'team_members', 'activity_logs', 'auth_sessions');
```

All four tables should show `rowsecurity = t`.

### 3 — Smoke-test RLS isolation

Connect as `saas_app` and verify that without `app.user_id` set, no rows are returned:

```sql
-- connect as saas_app
SET ROLE saas_app;
SELECT * FROM users;   -- should return 0 rows (no app.user_id set)

SELECT set_config('app.user_id', '1', true);
SELECT * FROM users;   -- should return only user id=1
```

### 4 — Confirm admin bypasses RLS

```sql
SET ROLE saas_admin;
SELECT count(*) FROM users;   -- should return total row count
```

## Local development

In local dev both `POSTGRES_URL` and `ADMIN_POSTGRES_URL` typically point to the same
connection (superuser or a dev user). The RLS migration is optional locally — you can
run it against the local DB, or skip it and develop without role isolation.

To skip RLS locally:
- Set only `POSTGRES_URL` (pointing to a dev superuser).
- Do not set `ADMIN_POSTGRES_URL`.
- `adminDb` falls back to `POSTGRES_URL` automatically.
- RLS policies are no-ops if the connecting role owns the tables (superuser bypasses RLS).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Dashboard queries return 0 rows | `withUserContext` not called before query | Wrap query in `withUserContext(user.id, ...)` |
| `permission denied for table ...` | `saas_app` lacks a grant on that table | Add `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO saas_app;` |
| Admin page returns 403 / empty data | `ADMIN_POSTGRES_URL` not set or points to `saas_app` | Set `ADMIN_POSTGRES_URL` to a `saas_admin` connection string in the admin deploy |
| Sign-in fails with RLS error | Auth action uses `db` instead of `adminDb` | Switch auth query to use `adminDb` from `lib/db/drizzle.ts` |
| `current_setting` returns empty string | `app.user_id` not set in this request context | Ensure `withUserContext` wraps the full query chain |

## Related files

| File | Purpose |
| --- | --- |
| `lib/db/drizzle.ts` | Exports `db` (saas_app) and `adminDb` (saas_admin) |
| `lib/db/with-user-context.ts` | Sets `app.user_id` for RLS inside a transaction |
| `lib/db/queries.ts` | App-level queries using `db` |
| `lib/db/queries.admin.ts` | Admin queries using `adminDb` |
| `lib/db/migrations/0026_rls_setup.sql` | Roles, grants, and RLS policy migration |
| `lib/modules/sdk-server-bootstrap.ts` | Wires both `db` and `adminDb` into the module SDK adapter |
| `app/sdk/src/server.ts` | SDK `DatabaseAdapter` contract — `getDb` and `getAdminDb` exports |
