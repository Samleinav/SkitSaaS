---
title: Environment Variables and Runtime Config
sidebar_position: 4
description: Canonical env variable reference with runtime fallback behavior and operational notes.
---

# Environment Variables and Runtime Config

This project resolves runtime config in two layers:

1. Environment variables (highest priority)
2. `app_configs` DB values (fallback)

The canonical baseline is `.env.example`.

## Core application

| Variable | Purpose | Default |
| --- | --- | --- |
| `POSTGRES_URL` | PostgreSQL connection string | none |
| `AUTH_SECRET` | Session token signing secret | none |
| `BASE_URL` | Absolute base URL | `http://localhost:3000` |

## Break-glass auth policy

| Variable | Purpose | Default |
| --- | --- | --- |
| `AUTH_BREAK_GLASS_EMAILS` | Comma-separated break-glass account emails | empty |
| `AUTH_BREAK_GLASS_REQUIRE_PASSKEY` | Enforce passkey-only login for break-glass accounts | `true` |
| `AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS` | Emergency toggle to allow password login for break-glass accounts | `false` |
| `AUTH_BREAK_GLASS_ALLOWED_IPS` | Comma-separated exact IP allowlist for break-glass password attempts | empty |
| `AUTH_BREAK_GLASS_MAX_ATTEMPTS` | Max failed password attempts before lockout | `5` |
| `AUTH_BREAK_GLASS_WINDOW_SECONDS` | Failed-attempt rolling window (seconds) | `900` |
| `AUTH_BREAK_GLASS_LOCKOUT_SECONDS` | Lockout duration after max attempts (seconds) | `1800` |

Notes:

- Password restriction only applies to emails listed in `AUTH_BREAK_GLASS_EMAILS`.
- When `AUTH_BREAK_GLASS_REQUIRE_PASSKEY=true` and bypass is disabled, password login is blocked for break-glass accounts.
- `AUTH_BREAK_GLASS_ALLOWED_IPS` matches exact normalized IP values; leave empty to disable IP filtering.

## Login methods by area

| Variable | Purpose | Default |
| --- | --- | --- |
| `AUTH_ADMIN_LOGIN_METHODS` | Allowed login methods for `/admin/login` | `password` |
| `AUTH_DASHBOARD_LOGIN_METHODS` | Allowed login methods for `/login` | `password` |

Notes:

- This policy is enforced server-side (password sign-in/sign-up actions) and reflected in login UI rendering.
- `AUTH_ADMIN_LOGIN_METHODS` and `AUTH_DASHBOARD_LOGIN_METHODS` are independent, so admin and dashboard can use different methods.
- Example split: `AUTH_ADMIN_LOGIN_METHODS=passkey` and `AUTH_DASHBOARD_LOGIN_METHODS=password`.
- Method tokens currently recognized by host policy are `password`, `passkey`, and `social`.

## Module-owned auth config docs

Auth provider module-specific config/env values are documented and owned by each module:

- `modules/mod.auth.passkey/README.md`
- `modules/mod.auth.social-logins/README.md`
- `modules/mod.auth.enterprise-sso/README.md`

Provider selection/filter keys used with provider-based login methods are documented in module ownership docs:

- `AUTH_ADMIN_SOCIAL_PROVIDERS`
- `AUTH_DASHBOARD_SOCIAL_PROVIDERS`
- `AUTH_DEFAULT_SOCIAL_PROVIDER`

This core document only tracks host-level env variables and policies.

## Deployment surface mode

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_SURFACE_MODE` | Select exposed route areas (`full`, `dashboard-only`, `admin-only`) | `full` |

Notes:

- `full`: admin + dashboard + frontend routes are enabled.
- `dashboard-only`: admin routes are disabled.
- `admin-only`: dashboard/frontend routes are disabled.
- Disabled areas are blocked in proxy and guarded again in area layouts/pages.

## Seed controls

| Variable | Purpose | Default |
| --- | --- | --- |
| `ALLOW_PRODUCTION_SEED` | Allow `db:seed` in production-like environments (`true/false`) | `false` |
| `SEED_USER_EMAIL` | Seed bootstrap user email | `test@test.com` |
| `SEED_USER_PASSWORD` | Seed bootstrap user password | `admin123` |
| `SEED_TEAM_NAME` | Seed bootstrap team name | `Test Team` |

Notes:

- In production-like environments (`NODE_ENV=production`, `VERCEL_ENV=production`, or `APP_ENV=production`), `db:seed` is blocked unless `ALLOW_PRODUCTION_SEED=true`.
- In production-like environments, seed also rejects default credentials and requires explicit secure values for `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`.
- Recommended production flow is migration-only deploy plus controlled one-time bootstrap seed when needed.

## Payments (Stripe)

| Variable | Purpose | Default |
| --- | --- | --- |
| `STRIPE_ENABLED` | Enable Stripe checkout (`true/false`) | empty |
| `STRIPE_SECRET_KEY` | Stripe API secret key | empty |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | empty |

## Payments (PayPal)

| Variable | Purpose | Default |
| --- | --- | --- |
| `PAYPAL_ENABLED` | Enable PayPal checkout (`true/false`) | empty |
| `PAYPAL_ENVIRONMENT` | `sandbox` or `production` | `sandbox` |
| `PAYPAL_CLIENT_ID` | PayPal client id | empty |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret | empty |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal public client id | empty |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook id for signature verification | empty |
| `PAYPAL_CURRENCY` | Currency code | `USD` |

Notes:

- If `STRIPE_ENABLED` / `PAYPAL_ENABLED` are unset or empty, runtime reads DB values from `/admin/app-config/payments-methods`.
- If those env vars are set, env wins over DB.
- PayPal plans are generated from subscription templates and persisted for reuse.

## Organization policy overrides

| Variable | Purpose | Default |
| --- | --- | --- |
| `ALLOW_MULTI_ORGANIZATIONS` | Allow multiple teams per user | `false` |
| `MAX_ORGANIZATIONS_PER_USER` | Hard cap on org count | empty |

## Theme selection (build-time target)

| Variable | Purpose | Default |
| --- | --- | --- |
| `THEME_ADMIN` | Selected admin area theme id | `theme.first.backoffice` |
| `THEME_DASHBOARD` | Selected dashboard area theme id | `theme.first.backoffice` |
| `THEME_FRONTEND` | Selected frontend area theme id | `theme.first.frontend` |
| `THEME_TEMPLATE_PRIORITY` | Backoffice template precedence (`theme` or `module`) | `theme` |
| `THEME_ADMIN_DEFAULT` | Legacy alias for `THEME_ADMIN` (deprecated) | empty |
| `THEME_DASHBOARD_DEFAULT` | Legacy alias for `THEME_DASHBOARD` (deprecated) | empty |

Legacy runtime keys (migration window only):

| Variable | Purpose | Default |
| --- | --- | --- |
| `THEME_MODE` | Global mode fallback (`system`, `light`, `dark`) | `system` |
| `THEME_ALLOW_USER_OVERRIDE` | Per-user runtime override (deprecated) | `true` |

Theme pack prepare/build helpers:

| Variable | Purpose | Default |
| --- | --- | --- |
| `THEMES_DIR` | Override theme packs directory used by `themes:prepare` | auto (`/themes`) |
| `THEMES_PREPARE_STRICT` | Strict compatibility mode in `themes:prepare` (`true/false`) | `true` |

Performance diagnostics (optional):

| Variable | Purpose | Default |
| --- | --- | --- |
| `PERF_DIAGNOSTICS` | Enable server-side perf trace logs (`true/false`) | `false` |
| `PERF_DIAGNOSTICS_SCOPES` | Comma-separated scope filter for traces (`admin`, `theme`, or `*`) | empty (all scopes when enabled) |

## SMTP

| Variable | Purpose | Default |
| --- | --- | --- |
| `SMTP_HOST` | SMTP host | empty |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS (`true/false`) | `false` |
| `SMTP_USER` | SMTP username | empty |
| `SMTP_PASSWORD` | SMTP password | empty |
| `SMTP_FROM_EMAIL` | Sender email | empty |
| `SMTP_FROM_NAME` | Sender name | `SaaS Starter` |
| `SMTP_REPLY_TO_EMAIL` | Reply-to email | empty |

## Feature flags

| Variable | Purpose | Default |
| --- | --- | --- |
| `FF_USE_APP_MODULES_RUNTIME` | Enable module runtime | `true` |
| `FF_USE_THEME_RUNTIME` | Legacy theme runtime switch (deprecated, ignored by host rendering) | `false` |
| `FF_USE_MODULE_DISPATCHER_ROUTES` | Enable module dispatcher routes | `true` |

## Module discovery and sync

| Variable | Purpose | Default |
| --- | --- | --- |
| `MODULES_DIR` | Override modules source directory | auto (`/modules`, then `/examplemodules`) |
| `MODULES_SYNC_ENABLE_NEW` | Enable new modules during sync | `true` |
| `MODULES_SYNC_INCLUDE_CORE` | Include `core.*` / `ops.*` in sync | `true` |
| `MODULES_SYNC_TIMEOUT_MS` | DB timeout for module sync | `15000` |

## Events and hooks queue (optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `EVENTS_REDIS_URL` | Redis URL for async event queue | empty |
| `REDIS_URL` | Fallback Redis URL | empty |

## Admin dashboard widgets

| Variable | Purpose | Default |
| --- | --- | --- |
| `ADMIN_DASHBOARD_ENABLED_MODULES` | Comma-separated widget override | empty |

## Ops, canary, and evidence scripts (optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `SMOKE_BASE_URL` | Base URL for smoke checks | `http://localhost:3000` |
| `SMOKE_AUTH_COOKIE` | Auth cookie for smoke checks | empty |
| `SMOKE_ALLOW_UNAUTH` | Treat 401/403 as acceptable in smoke checks | `true` |
| `SMOKE_MODULE_ID` | Optional module id for dispatcher smoke checks | empty |
| `CANARY_WINDOW_DAYS` | Canary report time window | `30` |
| `CANARY_LABEL` | Canary report label | empty |
| `CANARY_OUTPUT_FILE` | Canary report output path | empty |
| `CANARY_FAIL_ON_WARNING` | Exit non-zero when status is warning | `false` |
| `EVIDENCE_ENV` | Evidence label prefix (prod/staging/local) | empty |
| `EVIDENCE_DIR` | Evidence root directory | `docs/audit/canary-reports` |
| `EVIDENCE_DATE` | Evidence date folder (`YYYY-MM-DD`) | current date |
| `EVIDENCE_LABEL` | Explicit evidence label override | empty |
| `EVIDENCE_TASKS` | Evidence tasks (`canary,smoke,module` or `all`) | `all` |
| `EVIDENCE_DRY_RUN` | Create placeholders without running scripts | `false` |

## Subscription change worker (optional)

| Variable | Purpose | Default |
| --- | --- | --- |
| `CHANGE_REQUEST_LIMIT` | Max change requests per run | `50` |
| `CHANGE_REQUEST_DRY_RUN` | Dry-run worker mode | `false` |
