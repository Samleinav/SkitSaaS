---
title: Theme Build-Time Only ADR
sidebar_position: 9
---

# ADR: Theme Build-Time Only Simplification

Status: Accepted (implementation in progress)  
Date: 2026-02-13
Update: 2026-02-14 (`theme.config.ts[x]` and runtime `entryAssets/assets.json` compatibility removed; canonical `config.ts[x]` only)

## Context

Current theme resolution mixes runtime DB state (`app_configs`, `app_themes`, `user_theme_preferences`), env overrides, and a runtime feature flag (`FF_USE_THEME_RUNTIME`).

This increases complexity in SSR/hydration, introduces non-deterministic behavior between environments, and makes template precedence harder to reason about.

## Decision

The platform moves to a build-time-only theme selection model.

1. Theme selection is defined by environment variables at build/deploy time.
2. Runtime selection from DB/user preference is removed from normal rendering.
3. Frontend becomes route-driven (`routes.ts`) and does not use CTC template ids.
4. Admin and Dashboard remain template-driven (CTC), resolved server-side with configurable priority.
5. Missing required templates become build errors.

## Target Contracts

### Environment contract

Canonical variables:

- `THEME_ADMIN=theme.first.backoffice`
- `THEME_DASHBOARD=theme.first.backoffice`
- `THEME_FRONTEND=theme.first.frontend`
- `THEME_TEMPLATE_PRIORITY=theme|module` (default: `theme`)

Temporary compatibility aliases:

- `THEME_ADMIN_DEFAULT` -> `THEME_ADMIN`
- `THEME_DASHBOARD_DEFAULT` -> `THEME_DASHBOARD`

### Theme file contract

- New canonical files:
  - `config.ts`
  - `routes.ts` (frontend themes)

### Area model

- Frontend themes:
  - route-driven only
  - no template id resolution
- Admin/Dashboard themes:
  - template-driven CTC
  - deterministic resolver with `THEME_TEMPLATE_PRIORITY`

## Build-Time Enforcement Rules

`themes:prepare` (and/or build guard stage) must fail when:

1. A selected theme id does not exist.
2. A selected theme does not support the target area.
3. A required host template id for admin/dashboard is missing after applying priority.
4. Default backoffice baseline (`theme.first.backoffice`) cannot satisfy admin/dashboard fallback requirements.

Errors must identify:

- area
- requested theme id
- missing template id
- expected source order (`theme -> module` or `module -> theme`)

## Legacy Transition Strategy

1. Keep DB tables (`app_themes`, `user_theme_preferences`) as legacy during migration, but stop using them for normal render selection.
2. Keep `/admin/app-config/theme` only during migration window; remove it when runtime selection is fully disabled.
3. Emit explicit deprecation warnings for:
   - `THEME_ADMIN_DEFAULT`
   - `THEME_DASHBOARD_DEFAULT`
   - `FF_USE_THEME_RUNTIME`
4. Provide a runbook: changing theme means ENV change + rebuild/redeploy.

## Consequences

Benefits:

- deterministic render behavior per build
- simpler runtime and fewer hydration edge-cases
- clearer precedence between host/module/theme templates

Tradeoff:

- no dynamic theme switching without rebuild
