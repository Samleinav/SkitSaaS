---
title: Ops Validation Pack
sidebar_position: 6
---

# Ops Validation Pack

Operational checklist to close release validation criteria with repeatable evidence.

## 1) Goal

- Confirm parity on key admin/dashboard routes.
- Validate module runtime enable/disable behavior.
- Validate deterministic theme policy and user override resolution.

## 2) Preconditions

- DB migrated to the current migration set.
- Backfill/parity checks already reviewed.
- Runtime flags at expected defaults:
  - `FF_USE_APP_MODULES_RUNTIME=true`
  - `FF_USE_MODULE_DISPATCHER_ROUTES=true`

## 3) Automated checks

Run locally or in staging with DB access:

1. Module runtime sanity:
   - `pnpm restructure:module-runtime`
2. Module runtime tests:
   - `npx tsx --test tests/modules/module-runtime.test.ts`
3. Theme runtime determinism tests:
   - `npx tsx --test tests/theme/theme-runtime.test.ts`
4. Security/navigation governance pack:
   - `pnpm restructure:governance-pack`

Legacy note:

- `pnpm restructure:parity` is retired after the contract cleanup.
- Use `pnpm restructure:canary` for ongoing drift/health detection instead.

## 4) Security and navigation governance checklist

Run these focused checks before release when auth, routing, proxy, provider
handoff, or governance logging changed:

1. Proxy/API/governance regression pack:
   - `pnpm restructure:governance-pack`
2. Typecheck:
   - `pnpm exec tsc --noEmit`
3. Anonymous smoke of protected routes:
   - `SMOKE_BASE_URL=https://staging.example.com SMOKE_ALLOW_UNAUTH=true pnpm restructure:admin-smoke`
4. Authenticated smoke of protected routes:
   - `SMOKE_BASE_URL=https://staging.example.com SMOKE_AUTH_COOKIE="session=..." pnpm restructure:admin-smoke`

Minimum evidence expectations:

- `/admin*` redirects to `/admin/login` when anonymous
- `/dashboard*` redirects to `/login` when anonymous
- `/admin*` renders for an admin session
- `/dashboard*` renders for an authenticated non-admin user
- public allowlisted endpoints remain explicitly allowlisted by test
- governance sink tests still pass for `requestId`, deny events, and
  module-dispatch evidence

## 5) UI route checklist (manual)

Compare against baseline snapshots in `docs/audit/baseline-snapshots/2026-02-05`.

Validate routes (authenticated admin user):

- `/admin/app-config/*`
- `/admin/orders`
- `/admin/payments`
- `/admin/subscriptions`
- `/admin/subscriptions/templates`
- `/admin/suscriptions` (legacy redirect check)
- `/dashboard/subscriptions`

Capture new snapshots and record date/location if behavior changed.

## 6) Module enable/disable validation (staging)

This repo ships the built-in `ops.diagnostics` module in the core registry for
admin runtime smoke checks. It exposes `/admin/modules/ops.diagnostics` when the
row is enabled in `app_modules`.

Example SQL (staging only):

```sql
insert into app_modules (module_id, version, status, install_mode, installed_at, enabled_at, created_at, updated_at)
values ('ops.diagnostics', '1.0.0', 'enabled', 'core', now(), now(), now(), now())
on conflict (module_id)
do update set
  version = '1.0.0',
  status = 'enabled',
  install_mode = 'core',
  enabled_at = now(),
  disabled_at = null,
  updated_at = now();
```

Optional helper script:

```
npx tsx scripts/restructure-toggle-ops-module.ts enable
npx tsx scripts/restructure-toggle-ops-module.ts disable
```

Prefer the helper when possible because it validates `MODULE_ID` against the
registry and derives the manifest version/install mode automatically.

To validate a different module instead:

```
MODULE_ID=<real-module-id> MODULE_VERSION=<module-version> npx tsx scripts/restructure-toggle-ops-module.ts enable
MODULE_ID=<real-module-id> npx tsx scripts/restructure-toggle-ops-module.ts disable
```

Requirements for `<real-module-id>`:

- module must exist in the registry
- prefer the manifest version for `MODULE_VERSION`
- use a module with `dashboardPage` only if you also want dashboard dispatcher validation

Validation steps:

1. Visit `/admin` and confirm module diagnostics appears in nav.
2. Visit `/admin/modules/ops.diagnostics` and confirm page renders.
3. Disable the module:

```sql
update app_modules
set status = 'disabled', disabled_at = now(), updated_at = now()
where module_id = 'ops.diagnostics';
```

4. Confirm nav entry disappears and route returns 404.
5. If you also need dashboard dispatcher coverage, repeat the same flow with a
   real registered module that exposes `/dashboard/modules/<real-module-id>`.

## 7) Theme policy and override validation

1. Ensure selected themes are set by ENV (`THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`) and rebuilt (`pnpm themes:prepare`).
2. Set `THEME_ALLOW_USER_OVERRIDE=true` and verify users can toggle mode in `/admin` and `/dashboard`.
3. Set `THEME_ALLOW_USER_OVERRIDE=false` and verify mode toggle is disabled.
4. Flip `THEME_MODE` between `system`, `light`, and `dark`; verify deterministic resolution.

Evidence command:

- `npx tsx --test tests/theme/theme-runtime.test.ts`

## 8) Post-incident mini pack

After a security/navigation incident or suspicious regression, collect this
minimum pack before deeper analysis:

1. `pnpm restructure:governance-pack`
2. `pnpm restructure:canary`
3. Re-run the relevant HTTP smoke command(s) with and without an auth cookie.
4. Export `/admin/logs` evidence filtered by:
   - `requestId`
   - `eventCategory`
   - affected entity or actor

Attach:

- failing route/path
- redirect or deny behavior observed
- related `requestId`
- matching `sys_activity_logs` rows

## 9) Optional admin smoke pack

For lightweight route health checks:

```
SMOKE_BASE_URL=https://staging.example.com \
SMOKE_AUTH_COOKIE="session=..." \
pnpm restructure:admin-smoke
```

Related env vars:

- `SMOKE_BASE_URL` (default `http://localhost:3000`)
- `SMOKE_AUTH_COOKIE` (optional)
- `SMOKE_ALLOW_UNAUTH` (default `true`)
- `SMOKE_MODULE_ID` (optional)

Behavior note:

- anonymous `/admin*` redirects to `/admin/login`
- anonymous `/dashboard*` redirects to `/login`
- authenticated smoke still expects `2xx` responses unless a route is
  intentionally inaccessible for that session
