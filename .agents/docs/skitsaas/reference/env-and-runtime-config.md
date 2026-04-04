---
title: "Env And Runtime Config"
sidebar_position: 0
---

# Env And Runtime Config

Use this page when the task depends on how SkitSaaS resolves configuration at
runtime.

## Resolution Order

Runtime config resolves in two layers:

1. environment variables
2. DB-backed `app_configs` fallback values

If both exist, env wins.

## Core Application

| Variable | Purpose | Default |
|---|---|---|
| `POSTGRES_URL` | PostgreSQL connection string | none |
| `AUTH_SECRET` | session signing secret | none |
| `BASE_URL` | absolute base URL | `http://localhost:3000` |

## Break-Glass Auth Policy

| Variable | Purpose | Default |
|---|---|---|
| `AUTH_BREAK_GLASS_EMAILS` | protected emergency accounts | empty |
| `AUTH_BREAK_GLASS_REQUIRE_PASSKEY` | require passkey-only login | `true` |
| `AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS` | allow password fallback | `false` |
| `AUTH_BREAK_GLASS_ALLOWED_IPS` | exact IP allowlist | empty |
| `AUTH_BREAK_GLASS_MAX_ATTEMPTS` | max failed password attempts | `5` |
| `AUTH_BREAK_GLASS_WINDOW_SECONDS` | rolling window | `900` |
| `AUTH_BREAK_GLASS_LOCKOUT_SECONDS` | lockout duration | `1800` |

Practical rule:

- use these only for host-level security policy
- provider-specific auth module config belongs with each auth module

## Login Methods By Area

| Variable | Purpose | Default |
|---|---|---|
| `AUTH_ADMIN_LOGIN_METHODS` | allowed login methods for `/admin/login` | `password` |
| `AUTH_DASHBOARD_LOGIN_METHODS` | allowed login methods for `/login` | `password` |

Recognized method tokens today:

- `password`
- `passkey`
- `social`

## Route Base And Multi-Service Deployment

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_ROUTE_BASE_ADMIN` | admin base URL or prefix | `/admin` |
| `NEXT_PUBLIC_ROUTE_BASE_DASHBOARD` | dashboard base URL or prefix | `/dashboard` |
| `NEXT_PUBLIC_ROUTE_BASE_FRONTEND` | frontend base URL or prefix | root |
| `NEXT_PUBLIC_ROUTE_BASE_API` | API base URL or prefix | `/api` |
| `ROUTE_API_CORS_ORIGINS` | cross-origin API allowlist | empty |

Important rule:

- the configured value fully replaces the default base

Examples:

- `NEXT_PUBLIC_ROUTE_BASE_ADMIN=https://admin.myapp.com`
- `NEXT_PUBLIC_ROUTE_BASE_ADMIN=/management`
- `NEXT_PUBLIC_ROUTE_BASE_API=https://api.myapp.com/api`

## Deployment Surface Mode

| Variable | Purpose | Default |
|---|---|---|
| `APP_SURFACE_MODE` | `full`, `dashboard-only`, or `admin-only` | `full` |

Use this when one deployment should intentionally hide some route areas.

## Seed Controls

| Variable | Purpose | Default |
|---|---|---|
| `ALLOW_PRODUCTION_SEED` | allow `db:seed` in production-like envs | `false` |
| `SEED_USER_EMAIL` | bootstrap user email | `test@admin.com` |
| `SEED_USER_PASSWORD` | bootstrap user password | `admin123` |
| `SEED_TEAM_NAME` | bootstrap team name | `Test Team` |

Practical rule:

- production-like environments should be migration-first and seed sparingly

## Payments

Stripe:

| Variable | Purpose | Default |
|---|---|---|
| `STRIPE_ENABLED` | enable Stripe | empty |
| `STRIPE_SECRET_KEY` | secret key | empty |
| `STRIPE_WEBHOOK_SECRET` | webhook signature secret | empty |

PayPal:

| Variable | Purpose | Default |
|---|---|---|
| `PAYPAL_ENABLED` | enable PayPal | empty |
| `PAYPAL_ENVIRONMENT` | `sandbox` or `production` | `sandbox` |
| `PAYPAL_CLIENT_ID` | client id | empty |
| `PAYPAL_CLIENT_SECRET` | client secret | empty |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | public client id | empty |
| `PAYPAL_WEBHOOK_ID` | webhook id | empty |
| `PAYPAL_CURRENCY` | currency code | `USD` |

Practical rule:

- when payment env flags are unset, runtime can fall back to DB-backed payment
  method config

## Organization Policy

| Variable | Purpose | Default |
|---|---|---|
| `TEAMS_ENABLED` | enable team system and `/api/team` | `true` |
| `ALLOW_MULTI_ORGANIZATIONS` | allow multiple teams per user | `false` |
| `MAX_ORGANIZATIONS_PER_USER` | hard cap for user org count | empty |

## Theme Selection

| Variable | Purpose | Default |
|---|---|---|
| `THEME_ADMIN` | admin theme id | `theme.first.backoffice` |
| `THEME_DASHBOARD` | dashboard theme id | `theme.first.backoffice` |
| `THEME_FRONTEND` | frontend theme id | `theme.first.frontend` |
| `THEME_TEMPLATE_PRIORITY` | backoffice template precedence | `theme` |
| `THEMES_DIR` | override theme packs directory | auto |
| `THEMES_PREPARE_STRICT` | strict compatibility mode | `true` |

Useful note:

- theme selection is build-time driven, not per-request DB switching

## SMTP

| Variable | Purpose | Default |
|---|---|---|
| `SMTP_HOST` | SMTP host | empty |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | TLS mode | `false` |
| `SMTP_USER` | SMTP username | empty |
| `SMTP_PASSWORD` | SMTP password | empty |
| `SMTP_FROM_EMAIL` | sender email | empty |
| `SMTP_FROM_NAME` | sender name | `S-Kit-SaaS` |
| `SMTP_REPLY_TO_EMAIL` | reply-to email | empty |

## Module Runtime And Discovery

| Variable | Purpose | Default |
|---|---|---|
| `FF_USE_APP_MODULES_RUNTIME` | enable module runtime | `true` |
| `FF_USE_MODULE_DISPATCHER_ROUTES` | enable dispatcher routes | `true` |
| `MODULE_RUNTIME_MODE` | override runtime mode | empty |
| `ACTIVE_MODULES_ENABLE` | force-enable module ids | empty |
| `ACTIVE_MODULES_DISABLE` | force-disable module ids | empty |
| `MODULES_DIR` | override modules source dir | auto |
| `MODULES_SYNC_ENABLE_NEW` | enable new modules during sync | `true` |
| `MODULES_SYNC_INCLUDE_CORE` | include `core.*` and `ops.*` | `true` |
| `MODULES_SYNC_TIMEOUT_MS` | module sync DB timeout | `15000` |

## Events, Queueing, And Ops Scripts

Queueing:

| Variable | Purpose | Default |
|---|---|---|
| `EVENTS_REDIS_URL` | Redis URL for async event queue | empty |
| `REDIS_URL` | fallback Redis URL | empty |

Smoke and canary helpers:

| Variable | Purpose | Default |
|---|---|---|
| `SMOKE_BASE_URL` | base URL for smoke checks | `http://localhost:3000` |
| `SMOKE_AUTH_COOKIE` | auth cookie for smoke checks | empty |
| `SMOKE_ALLOW_UNAUTH` | allow 401/403 in smoke | `true` |
| `SMOKE_MODULE_ID` | dispatcher smoke target | empty |
| `CANARY_WINDOW_DAYS` | canary time window | `30` |
| `CANARY_LABEL` | canary label | empty |
| `CANARY_OUTPUT_FILE` | canary output path | empty |
| `CANARY_FAIL_ON_WARNING` | non-zero on warning | `false` |
| `EVIDENCE_ENV` | evidence label prefix | empty |
| `EVIDENCE_DIR` | evidence root | `docs/audit/canary-reports` |
| `EVIDENCE_DATE` | evidence date folder | current date |
| `EVIDENCE_LABEL` | explicit evidence label | empty |
| `EVIDENCE_TASKS` | evidence task set | `all` |
| `EVIDENCE_DRY_RUN` | create placeholders only | `false` |

## Subscription Change Worker

| Variable | Purpose | Default |
|---|---|---|
| `CHANGE_REQUEST_LIMIT` | max change requests per run | `50` |
| `CHANGE_REQUEST_DRY_RUN` | worker dry-run mode | `false` |

## Practical Rule

When the question is "why does runtime behave like this?", check:

1. env
2. DB-backed app config
3. generated prepare/build artifacts
4. area-specific runtime code

## Related Docs

- `./platform-capabilities.md`
- `./i18n-runtime.md`
- `../routing-and-route-factories.md`
- `../theme-development/getting-started.md`
- `../operations/validation-and-canary.md`
