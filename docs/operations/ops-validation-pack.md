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

Optional parity safety check:

- `pnpm restructure:parity`

## 4) UI route checklist (manual)

Compare against baseline snapshots in `docs/audit/baseline-snapshots/2026-02-05`.

Validate routes (authenticated admin user):

- `/admin/app-config/*`
- `/admin/orders`
- `/admin/payments`
- `/admin/subscriptions`
- `/admin/suscriptions`
- `/dashboard/subscriptions`

Capture new snapshots and record date/location if behavior changed.

## 5) Module enable/disable validation (staging)

The registry includes `ops.diagnostics` for runtime checks. It is not enabled by default.

Example SQL (staging only):

```sql
insert into app_modules (module_id, version, status, install_mode, installed_at, enabled_at, created_at, updated_at)
values ('ops.diagnostics', '1.0.0', 'enabled', 'plugin', now(), now(), now(), now())
on conflict (module_id)
do update set status = 'enabled', enabled_at = now(), updated_at = now();
```

Optional helper script:

```
npx tsx scripts/restructure-toggle-ops-module.ts enable
npx tsx scripts/restructure-toggle-ops-module.ts disable
```

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

## 6) Theme policy and override validation

1. Ensure selected themes are set by ENV (`THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`) and rebuilt (`pnpm themes:prepare`).
2. Set `THEME_ALLOW_USER_OVERRIDE=true` and verify users can toggle mode in `/admin` and `/dashboard`.
3. Set `THEME_ALLOW_USER_OVERRIDE=false` and verify mode toggle is disabled.
4. Flip `THEME_MODE` between `system`, `light`, and `dark`; verify deterministic resolution.

Evidence command:

- `npx tsx --test tests/theme/theme-runtime.test.ts`

## 7) Optional admin smoke pack

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

