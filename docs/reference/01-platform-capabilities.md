---
title: Platform Technical Capabilities
sidebar_position: 1
description: Current host capabilities mapped to implementation files, routes, APIs, and runtime systems.
---

# Platform Technical Capabilities

This document maps current platform capabilities to implementation files and data models.

## 1) Authentication and Sessions

- Email/password auth with server sessions.
- Entry routes: `app/(login)/*` (`/login`, `/admin/login`, `/sign-up`, legacy `/sign-in`).
- Local bootstrap includes a seed user with role `admin`. In shared/prod environments, rotate or replace default credentials.
- Guards:
  - Admin: `app/(dashboard)/admin/guards.ts` (`requireAdminAccess`)
  - Dashboard: `lib/auth/middleware.ts` (`withTeam`, `getUser`)

## 2) Teams and Memberships

- Tables: `teams`, `team_members`, `invitations`.
- Core queries: `lib/db/queries.ts`.
- User team settings routes: `app/(dashboard)/dashboard/*`.

## 3) Subscriptions (Current State)

- Source of truth: `subscription_assignments`.
- Scheduling table: `subscription_change_requests`.
- Trial usage ledger: `subscription_trial_usage` (one trial per target/category).
- Period metadata on assignments:
  - `current_period_start`, `current_period_end`
  - `trial_ends_at`, `cancel_at_period_end`, `canceled_at`
- Templates and features:
  - `subscription_templates`
    - hierarchy fields: `category_key`, `hierarchy_rank`
  - `subscription_template_features`
- Read helpers:
  - `lib/features/subscription.ts`
  - `lib/db/queries.ts`
- Lifecycle projection:
  - `lib/payments/order-subscription-events.ts`
- Policy/classification:
  - `lib/payments/subscription-policy.ts`
  - classifies `same_template`, `upgrade`, `downgrade`, `lateral_change`, `new_purchase`
  - resolves trial eligibility/consumption by target scope (`team`/`user`)

## 4) Features and Quotas

- Central catalog: `lib/features/catalog.ts`.
- Controllers:
  - `lib/features/controller.ts`
  - `getDashboardFeatureController` in `app/(dashboard)/dashboard/controller.ts`
- Usage ledger table: `quota_usage` (per-scope, per-feature, per-period consumption tracking)

## 5) Payments: Orders and Transactions

Operational timeline:

- `checkout_orders` (pre-payment orchestration, tokenized checkout context)
- `checkout_order_items` (line items attached to one checkout order)
- `payment_orders` (status, scope, provider refs)
- `payment_logs` (raw event audit)

Settlement timeline:

- `payment_transactions` (sales, reversals, refunds, fee fields)

Adapters and pipeline:

- Stripe: `lib/payments/stripe.ts`
- PayPal: `lib/payments/paypal.ts`
- Checkout orchestration: `lib/payments/checkout-system.ts`
- Checkout order state machine: `lib/payments/checkout-orders.ts`
- Checkout payment-method dispatch: `lib/payments/payment-methods.ts`
- Legacy route usage/deprecation logs: `lib/payments/legacy-routes.ts`

Canonical API surface:

- `POST /api/checkout/[checkoutToken]/pay/[paymentMethodId]`
- `GET /api/checkout/methods`
- `POST /api/checkout/methods/[paymentMethodId]/cancel`
- `GET|POST /api/checkout/methods/[paymentMethodId]/return`
- `POST /api/checkout/methods/[paymentMethodId]/webhook`

Current self-service scope policy:

- `/pricing` self-service checkout currently provisions `organization`-scoped templates only.
- `user`-scoped templates are still supported by lifecycle/policy and admin/manual assignment flows.

Compatibility API surface (kept for migration):

- Stripe: `/api/stripe/*`
- PayPal: `/api/paypal/*`

## 6) Admin area capabilities

Base route group:

- `app/(dashboard)/admin/*`

Main route surfaces:

- `/admin`
- `/admin/users`
- `/admin/subscriptions` (active assignment operations)
- `/admin/subscriptions/templates` (template management)
- `/admin/suscriptions` (legacy redirect to `/admin/subscriptions`)
- `/admin/orders`
- `/admin/payments`
- `/admin/logs`
- `/admin/app-config/*`
- `/admin/app-config/modules` exposes module inventory, manifest-driven runtime BuildForms, and DB emergency enable/disable controls.

Compatibility route:

- `/admin/billing` redirects to `/admin/subscriptions`

## 7) Dashboard area capabilities

Base route group:

- `app/(dashboard)/dashboard/*`

Main route surfaces:

- `/dashboard`
- `/dashboard/general`
- `/dashboard/activity`
- `/dashboard/security`
- `/dashboard/subscriptions`

## 8) Modules runtime (Admin/Dashboard/API)

Manifest-driven runtime:

- `lib/modules/manifest.ts`
- `lib/modules/registry.ts`
- `lib/modules/runtime.ts`

Dispatchers:

- `/admin/modules/[moduleId]/[[...slug]]`
- `/dashboard/modules/[moduleId]/[[...slug]]`
- `/admin/[...moduleAlias]` (custom module aliases)
- `/dashboard/[...moduleAlias]` (custom module aliases)
- `/api/modules/[moduleId]/[[...slug]]`

Runtime state table:

- `app_modules`

Example modules currently included in this repository:

- `mod.example.admin`
- `mod.example.api`
- `mod.example.dashboard`
- `mod.example.package`
- `mod.example.portal`
- `mod.example.suite`

## 9) Events and hooks

- Event bus: `lib/events/bus.ts`
- Hook registry: `lib/events/registry.ts`
- Optional Redis queue: `lib/events/queue.ts`
- Hook constants: `lib/events/catalog.ts`
- Event bus logs: `sys_activity_logs` (`eventCategory = 'event_bus'`)

## 9.1) Persistent notifications

- Tables: `system_notifications`, `system_notification_recipients`
- Core service: `lib/notifications/service.ts`
- Runtime APIs:
  - `GET /api/notifications`
  - `POST /api/notifications/read`
  - `POST /api/notifications/dismiss`
- Audience modes:
  - all users (`global`)
  - one or many users
  - team audiences (`all`, `members`, `owner`) resolved from `team_members` and persisted as direct recipients
- SDK surface:
  - client: `useNotifications()`
  - server: `createNotification()`, `notifyGlobal()`, `notifyUser()`, `notifyUsers()`, `notifyTeam()`, `notifyTeamMembers()`, `notifyTeamOwner()`
- Host/theme integration:
  - `components/ui/notification-runtime.tsx` bridges persisted items into the toast runtime and marks them as read after display
  - backoffice themes can expose the feed from `ui.user-menu`; `theme.first.backoffice` and `theme.nexus` ship a notification center there

## 10) Theme runtime

Runtime sources:

- ENV selection (`THEME_ADMIN`, `THEME_DASHBOARD`, `THEME_FRONTEND`) generated at build time
- runtime mode policy (`THEME_MODE`, `THEME_ALLOW_USER_OVERRIDE`)
- `app_themes` and `user_theme_preferences` are legacy compatibility tables
- external packs in `themes/*` prepared into `lib/themes/external.generated.ts`

Core implementation:

- `lib/theme-runtime.ts`
- `components/theme/theme-runtime-provider.tsx`
- `lib/themes/manifest.ts`
- `scripts/themes-prepare.ts`
- `lib/themes/runtime.ts`

Area behavior:

- `/admin/*` and `/admin/login` resolve `admin`
- `/dashboard/*`, `/login`, `/sign-up`, legacy `/sign-in` resolve `dashboard`
- public pages resolve `frontend`

Token application:

- SSR style injection in `app/(frontend)/layout.tsx`, `app/(dashboard)/admin/layout.tsx`, `app/(dashboard)/dashboard/layout.tsx`, and login pages.
- Hydration synchronization in `ThemeRuntimeProvider`.

## 11) Config system

Primary runtime config table:

- `app_configs`

Used by:

- payment provider config
- email config
- organization policy
- theme policy

Helpers:

- `lib/config/app-config.ts`
- `lib/config/app-config-writes.ts`
- `@skitsaas/sdk` / `lib/modules/manifest.ts` can declare `runtimeConfig.fields`, which Core Admin renders in `/admin/app-config/modules` through `BuildForm`.

## 12) Email system

- External SMTP only.
- Logs table: `email_logs`.
- Admin UI: `/admin/logs?tab=email`.
- Sender: `lib/email/smtp.ts`.

## 13) Observability and logs

- `sys_activity_logs`: cross-domain audit
- `payment_logs`: payment event audit
- `payment_transactions`: financial event trail
- `email_logs`: SMTP delivery audit

## 14) Test coverage (key areas)

- Modules runtime: `tests/modules/module-runtime.test.ts`
- Theme runtime: `tests/theme/theme-runtime.test.ts`
- Payments lifecycle: `tests/payments/order-subscription-lifecycle.test.ts`
- Admin form utils: `tests/payments/admin-*.test.ts`

## 15) Ops scripts

- `pnpm restructure:canary`
- `pnpm restructure:admin-smoke`
- `pnpm restructure:module-runtime`
- `pnpm restructure:evidence`
- `pnpm subscriptions:change-requests`

Related guide: `docs/operations/ops-canary-pack.md`.

## 16) Component Template Controller (CTC)

Core contract/runtime:

- `lib/templates/catalog.ts`
- `lib/templates/contract.ts`
- `lib/templates/controller.ts`
- `lib/templates/theme-pack.ts`
- `lib/templates/module-pack.ts`
- `lib/templates/runtime.ts`
- `lib/templates/ui-table.ts`
- `components/ui/template-table.tsx`

Current capabilities:

- deterministic template precedence (`module -> theme -> module default -> core`)
- lock policy for critical components (`lockTemplate`)
- safe render fallback (`renderWithTemplate`)
- resolution traces for observability/debug
- theme `entryTemplates` registration by area (`global` + area-specific)
- module `templatePack` registration by `context.moduleId` (defaults/overrides)
- source-package template pack artifact validation in:
  - `scripts/modules-build.ts`
  - `scripts/modules-prepare.ts`
- pilot migrations with server-side template resolution and trace attributes:
  - `ui.table` (`TemplateTable`)
  - `ui.async-submit-button` (`TemplateAsyncSubmitButton`)
  - `ui.alert-dialog` via `TemplateConfirmSubmitButton`
- integration coverage:
  - `tests/templates/template-host-module-theme.integration.test.ts`
