---
name: core-security-auth
description: Configure and extend the platform's database security model and auth provider contracts. Use this skill when working on PostgreSQL RLS roles, `withUserContext`, DB grants, or adding/modifying an auth provider (passkey, OAuth2, OIDC, SAML) via the module auth SPI.
---

# core-security-auth

## Scope

- RLS setup: `saas_app` / `saas_admin` roles, grants, policies, `withUserContext`.
- Auth provider SPI: `authProviders` manifest contract, core registry, route handoff, diagnostics.

## Required References

Read before editing:

- `docs/security/01-rls-setup.md` — roles, grants, policies, `withUserContext`, module DB access rules, verification SQL
- `docs/security/02-auth-provider-spi.md` — manifest contract, registry behavior, `/api/auth/providers` diagnostics, route handoff architecture

Key files:

| File | Purpose |
|------|---------|
| `lib/db/drizzle.ts` | Exports `db` (saas_app) and `adminDb` (saas_admin) |
| `lib/db/with-user-context.ts` | Sets `app.user_id` for RLS inside a transaction |
| `lib/db/migrations/0026_rls_setup.sql` | Roles, grants, and RLS policy migration |
| `lib/modules/sdk-server-bootstrap.ts` | Wires `db` + `adminDb` into the module SDK adapter |
| `app/sdk/src/server.ts` | SDK `DatabaseAdapter` — `getDb` and `getAdminDb` exports |

## DB Role Rules

| Client | Role | Access |
|--------|------|--------|
| `db` | `saas_app` | User-facing tables only; RLS enforced per `app.user_id` |
| `adminDb` | `saas_admin` | All tables; RLS bypassed (`BYPASSRLS`) |

Dashboard server actions that write user-scoped rows must use `withUserContext`:

```ts
import { withUserContext } from '@/lib/db/with-user-context';
return withUserContext(user.id, (tx) => tx.update(users).set({ name }).where(eq(users.id, user.id)));
```

Admin pages use `adminDb` directly (via `queries.admin.ts`). No `withUserContext` needed.

## Module DB Access Rule

All module code accesses the database through `getAdminDb()` from `@skitsaas/sdk/server`. Never `getDb()` by default — module-owned tables are not in the `saas_app` grant list.

```ts
// modules/mod.x/src/data.ts
import { getAdminDb } from '@skitsaas/sdk/server';
const db = getAdminDb<any>(); // module applies its own WHERE conditions
```

Use `getDb()` only when explicitly targeting RLS-protected host tables with `withUserContext` in the call chain.

## Auth Provider SPI

Module exposes providers via `authProviders` in `ModuleManifest`:

```ts
authProviders: [{
  providerId: 'google',
  kind: 'oauth2',
  flow: 'both',
  routes: {
    startPath: '/start/google',
    callbackPath: '/callback/google',
    healthPath: '/health'
  }
}]
```

Core owns: enabled-provider registry, session issuance, conflict handling, route handoff.
Module owns: provider start/callback implementation and provider-specific config.

Provider-specific docs live in `modules/mod.auth.<id>/README.md`, not in this skill.

## Adding a New Table with RLS

When adding a host table that needs user-scoping:

1. Enable RLS: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
2. Create policy: `CREATE POLICY user_isolation ON <table> USING (user_id = current_setting('app.user_id')::int);`
3. Add grant to `saas_app`: `GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO saas_app;`
4. Add to `TABLE_REGISTRY` in `lib/modules/sdk-server-bootstrap.ts` if modules need cross-table access.

## Verification

```sql
-- Confirm roles exist
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('saas_app', 'saas_admin');

-- Confirm RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename IN ('users','team_members','activity_logs','auth_sessions');
```

```bash
# Confirm no module imports host DB directly (must return 0 matches)
rg -n "from '@/lib/db|from \"@/lib/db" modules/
```
