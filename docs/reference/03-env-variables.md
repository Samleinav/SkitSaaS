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

This core document only tracks host-level env variables. Auth extension modules (passkey, social login, SSO) document their own config in their respective `README.md`.

## Multi-service area base URLs

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_ROUTE_BASE_ADMIN` | Base URL/prefix for the admin area | `/admin` |
| `NEXT_PUBLIC_ROUTE_BASE_DASHBOARD` | Base URL/prefix for the dashboard area | `/dashboard` |
| `NEXT_PUBLIC_ROUTE_BASE_FRONTEND` | Base URL/prefix for the frontend area | `` (root) |
| `NEXT_PUBLIC_ROUTE_BASE_API` | Base URL/prefix for API routes | `/api` |
| `ROUTE_API_CORS_ORIGINS` | Comma-separated allowed origins for cross-origin API requests | empty (CORS disabled) |

Notes:

- `NEXT_PUBLIC_` prefix makes values available in both server and client bundles, which is required for URL generation in React components and `<Link>` hrefs.
- The env var value **completely replaces** the default prefix — there is no separate host/path split. Examples:
  - `NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com` → `RouteAdmin('/users')` = `https://admin.myapp.com/users` (no `/admin` path — the host is the admin domain)
  - `NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api` → `RouteApi('/modules/mod.x/items')` = `https://api.myapp.com/api/modules/mod.x/items`
  - `NEXT_PUBLIC_ROUTE_BASE_ADMIN=/management` → `RouteAdmin('/users')` = `/management/users` (custom prefix, same host)
- For a separate **Next.js** API service (routes under `/api/`), include `/api` in the base: `NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api`. For a bare Node.js/Bun server with routes at root, omit it: `https://api.myapp.com`.
- `ROUTE_API_CORS_ORIGINS`: set when the API is deployed on a separate origin. Preflight `OPTIONS` requests are handled automatically and `Access-Control-Allow-Origin` headers are added to all API responses. Use `*` for a fully public API.
- Example split deployment: `NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api` and `ROUTE_API_CORS_ORIGINS=https://app.myapp.com,https://admin.myapp.com`.

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
| `SEED_USER_EMAIL` | Seed bootstrap admin email | `test@admin.com` |
| `SEED_USER_PASSWORD` | Seed bootstrap user password | `admin123` |
| `SEED_TEAM_NAME` | Seed bootstrap team name | `Test Team` |

Notes:

- In production-like environments (`NODE_ENV=production`, `VERCEL_ENV=production`, or `APP_ENV=production`), `db:seed` is blocked unless `ALLOW_PRODUCTION_SEED=true`.
- In production-like environments, seed also rejects default credentials and requires explicit secure values for `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`.
- `SEED_TEAM_NAME` is ignored when `TEAMS_ENABLED=false`.
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

## Organization runtime toggle

| Variable | Purpose | Default |
| --- | --- | --- |
| `TEAMS_ENABLED` | Enable the team/organization system and `/api/team` | `true` |

Notes:

- `TEAMS_ENABLED=false` switches dashboard users into standalone mode, skips automatic team creation during sign-up/seed, and makes `/api/team` return `404`.
- User and organization quotas are controlled by subscription templates, not by app-config environment overrides.

## Theme selection (build-time target)

| Variable | Purpose | Default |
| --- | --- | --- |
| `THEME_ADMIN` | Selected admin area theme id | `theme.first.backoffice` |
| `THEME_DASHBOARD` | Selected dashboard area theme id | `theme.first.backoffice` |
| `THEME_FRONTEND` | Selected frontend area theme id | `theme.first.frontend` |
| `THEME_TEMPLATE_PRIORITY` | Backoffice template precedence (`theme` or `module`) | `theme` |
| `THEME_ADMIN_DEFAULT` | Legacy alias for `THEME_ADMIN` (deprecated) | empty |
| `THEME_DASHBOARD_DEFAULT` | Legacy alias for `THEME_DASHBOARD` (deprecated) | empty |

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
| `FF_USE_MODULE_DISPATCHER_ROUTES` | Enable module dispatcher routes | `true` |

## App runtime config overrides

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_PROJECT_NAME` | Override `app.config.ts` `projectName` | empty |
| `MODULE_RUNTIME_MODE` | Override `app.config.ts` `moduleRuntimeMode` (`db`, `config`, `hybrid`) | empty |
| `ACTIVE_MODULES_ENABLE` | Comma-separated modules to force-enable at runtime | empty |
| `ACTIVE_MODULES_DISABLE` | Comma-separated modules to force-disable at runtime | empty |

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
