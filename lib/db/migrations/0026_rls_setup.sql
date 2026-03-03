-- ============================================================
-- Migration 0026: PostgreSQL roles + RLS row-level security
-- ============================================================
-- Run order matters. Execute once against the target database.
-- Creating roles requires SUPERUSER or CREATEROLE privilege.
-- On Supabase: run the CREATE ROLE blocks in the SQL editor
-- with the `postgres` (superuser) role, then the rest normally.
-- ============================================================

-- ── 1. Create database roles ──────────────────────────────────────────────────

-- App role: used by the dashboard + frontend deployment.
-- Has SELECT/INSERT/UPDATE/DELETE on user-facing tables only.
-- RLS policies further restrict reads/writes to the current user's rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_app') THEN
    CREATE ROLE saas_app LOGIN PASSWORD 'CHANGE_ME_APP';
  END IF;
END
$$;

-- Admin role: used exclusively by the /admin deployment.
-- Full access; bypasses RLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_admin') THEN
    CREATE ROLE saas_admin LOGIN PASSWORD 'CHANGE_ME_ADMIN' BYPASSRLS;
  END IF;
END
$$;

-- ── 2. Schema + sequence grants ───────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO saas_app, saas_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO saas_app, saas_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO saas_app, saas_admin;

-- ── 3. Table grants ───────────────────────────────────────────────────────────

-- saas_admin: full access to every table
GRANT ALL ON ALL TABLES IN SCHEMA public TO saas_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO saas_admin;

-- saas_app: access only to user-facing tables (no admin-only tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  teams,
  team_members,
  activity_logs,
  auth_sessions,
  subscription_assignments,
  subscription_templates,
  subscription_template_features,
  payment_orders,
  password_reset_tokens
TO saas_app;

-- Read-only tables for app (needed for feature checks, pricing, checkout)
GRANT SELECT ON
  app_configs,
  subscription_templates,
  subscription_template_features
TO saas_app;

-- Admin-only tables: no access for saas_app
-- (email_logs, payment_logs, payment_transactions, sys_activity_logs,
--  app_configs writes — saas_app cannot SELECT/INSERT/UPDATE these)

-- ── 4. Enable RLS on user-scoped tables ──────────────────────────────────────

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS policies ───────────────────────────────────────────────────────────
-- Each policy uses current_setting('app.user_id', true) which is set
-- per-request by withUserContext() before executing queries.

-- users: each user sees and can modify only their own row
CREATE POLICY users_own_row ON users
  AS PERMISSIVE FOR ALL TO saas_app
  USING (id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), '')::int);

-- team_members: user sees only their own memberships
CREATE POLICY team_members_own_rows ON team_members
  AS PERMISSIVE FOR ALL TO saas_app
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::int);

-- activity_logs: user sees only their own logs
CREATE POLICY activity_logs_own_rows ON activity_logs
  AS PERMISSIVE FOR ALL TO saas_app
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::int);

-- auth_sessions: user can only manage their own sessions
CREATE POLICY auth_sessions_own_rows ON auth_sessions
  AS PERMISSIVE FOR ALL TO saas_app
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::int)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::int);

-- ── 6. Notes ──────────────────────────────────────────────────────────────────
-- After running this migration:
-- 1. Set ADMIN_POSTGRES_URL in the admin deployment env to a connection
--    string authenticated as saas_admin.
-- 2. Set POSTGRES_URL in the dashboard/frontend deployment env to a
--    connection string authenticated as saas_app.
-- 3. All dashboard server actions that write data must call withUserContext()
--    from lib/db/with-user-context.ts to set app.user_id before queries.
-- 4. Auth actions (sign-in, sign-up) use adminDb since no user_id is known yet.
