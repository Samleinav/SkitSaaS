---
title: "Platform Capabilities"
sidebar_position: 0
---

# Platform Capabilities

Use this page to answer the question "what does SkitSaaS already know how to
do?" before designing new code.

## Authentication And Sessions

Current host capabilities:

- email/password auth with server sessions
- separate login surfaces for `/login` and `/admin/login`
- break-glass auth policy through env-backed restrictions
- provider handoff routes for module-owned auth providers
- paid signup can stage `signup_intents` and create the real account only after checkout succeeds

Main routes:

- `app/(login)/*`
- `GET|POST /api/auth/providers/[providerId]/start`
- `GET|POST /api/auth/providers/[providerId]/callback`

Main files:

- `lib/auth/*`
- `app/(login)/*`
- `app/api/auth/providers/*`

## Teams And Memberships

Core organizational capabilities:

- teams and membership records
- invitation workflow
- team-aware dashboard behavior
- optional standalone mode when teams are disabled
- deterministic "current team" resolution for helpers that need one team without
  an explicit selector: owner memberships first, then earliest `joined_at`,
  then lowest `team_id`

Main tables:

- `teams`
- `team_members`
- `invitations`

Main files:

- `lib/db/queries.ts`
- `app/(dashboard)/dashboard/*`
- `app/api/team/*`

## Subscriptions And Billing

Current billing capabilities:

- subscription templates and feature definitions
- operator-controlled feature display order for pricing/admin presentation
- assignment-based subscription state
- change requests for scheduled transitions
- trial eligibility and consumption tracking
- team- and user-targeted subscription flows
- env/DB-driven signup defaults
- scope-based lifecycle fallback to reserved default tiers

Source-of-truth tables:

- `subscription_templates`
- `subscription_template_features`
- `subscription_assignments`
- `subscription_change_requests`
- `subscription_trial_usage`

Main files:

- `lib/features/subscription.ts`
- `lib/payments/subscription-policy.ts`
- `lib/payments/order-subscription-events.ts`
- `lib/payments/subscription-signup-policy.ts`

## Features And Quotas

Current plan-aware capabilities:

- centralized feature catalog
- host feature controller reads
- quota usage ledger
- SDK quota access through server adapters

Main tables and files:

- `quota_usage`
- `lib/features/catalog.ts`
- `lib/features/controller.ts`
- `lib/quota/*`
- `lib/modules/sdk-server-bootstrap.ts`

## Payments, Checkout, And Settlement

The payment model is intentionally split into stages.

Checkout orchestration:

- `checkout_orders`
- `checkout_order_items`
- `checkout_payment_attempt_logs`

Operational payment lifecycle:

- `payment_orders`
- `payment_logs`

Settled money movement:

- `payment_transactions`

Canonical API surface:

- `POST /api/checkout/[checkoutToken]/pay/[paymentMethodId]`
- `GET /api/checkout/methods`
- `POST /api/checkout/methods/[paymentMethodId]/cancel`
- `GET|POST /api/checkout/methods/[paymentMethodId]/return`
- `POST /api/checkout/methods/[paymentMethodId]/webhook`
- legacy `POST /api/paypal/checkout/cancel` now mirrors the canonical PayPal
  cancel-access model, so user-scope orders and guest `signup_intent` cancel
  flows do not depend on the old team-owner-only wrapper logic

Current paid-signup checkout model:

- `lib/payments/signup-intents.ts` links public signup to a targetless checkout order
- guest checkout access is allowed only for tokens tied to a `signup_intent`
- the canonical method-discovery/start routes and the legacy PayPal return route
  enforce guest access through that live signup-intent token check instead of a
  blanket session proxy
- return/webhook finalization creates the real user/team and purchased assignment
- module payment methods receive `startPath` through a normalized internal
  `POST` dispatch; callback routes try that normalized bridge first and then
  fall back to the original `GET` callback request when the module only exposes
  a typed return/cancel handler

Self-service pricing scope:

- with `TEAMS_ENABLED=true`, `/pricing` renders organization templates and
  checkout targets the current team
- with `TEAMS_ENABLED=false`, `/pricing` renders user templates and checkout
  targets the current user
- until the product has an explicit active-organization selector, "current
  team" follows the deterministic membership ordering above

Main files:

- `lib/payments/checkout-system.ts`
- `lib/payments/checkout-orders.ts`
- `lib/payments/payment-methods.ts`
- `lib/payments/stripe.ts`
- `lib/payments/paypal.ts`

## Admin Area

Admin capabilities include:

- user and team administration
- subscription and template management
- payment and order administration
- app-config management
- signup default management in `/admin/app-config/subscriptions`
- runtime log inspection
- module runtime control surfaces

Main routes:

- `/admin`
- `/admin/users`
- `/admin/subscriptions`
- `/admin/subscriptions/templates`
- `/admin/orders`
- `/admin/payments`
- `/admin/logs`
- `/admin/app-config/*`
- `/admin/app-config/modules`

Main files:

- `app/(dashboard)/admin/*`
- `app/(dashboard)/admin/guards.ts`

## Dashboard Area

Dashboard capabilities include:

- account and team settings
- activity and security pages
- subscription self-service surfaces
- team-aware user workflows

Main routes:

- `/dashboard`
- `/dashboard/general`
- `/dashboard/activity`
- `/dashboard/security`
- `/dashboard/subscriptions`

## Modules Runtime

Current runtime supports:

- manifest-driven registry
- admin, dashboard, frontend, and API dispatchers
- alias routes
- portal registration
- module config and DB helpers through the SDK bridge

Dispatcher routes:

- `/admin/modules/[moduleId]/[[...slug]]`
- `/dashboard/modules/[moduleId]/[[...slug]]`
- `/modules/[moduleId]/[[...slug]]`
- `/api/modules/[moduleId]/[[...slug]]`

Runtime state:

- `app_modules`

Main files:

- `lib/modules/manifest.ts`
- `lib/modules/registry.ts`
- `lib/modules/runtime.ts`
- `lib/modules/sdk-server-bootstrap.ts`

## Events, Hooks, And Notifications

Cross-cutting platform services include:

- event bus with optional queueing
- persisted notifications with audience targeting
- toast bridge for private-area delivery
- SDK client and server notification helpers

Main tables:

- `system_notifications`
- `system_notification_recipients`
- `sys_activity_logs`

Main files:

- `lib/events/*`
- `lib/notifications/service.ts`
- `components/ui/notification-runtime.tsx`

## Theme Runtime

Current theme capabilities:

- build-time theme selection per area
- route-owned frontend themes
- backoffice CTC template overrides
- area-scoped assets and locale overrides

Main files:

- `themes/*`
- `lib/templates/*`
- `components/theme/*`

## Config, Logs, And Operational Services

Operational host services include:

- DB-backed `app_configs` fallback for runtime config
- SMTP delivery and email logs
- activity log ingestion and admin log UI
- theme/module/i18n prepare pipelines
- smoke and canary helper scripts

Main tables:

- `app_configs`
- `email_logs`
- `sys_activity_logs`

## Practical Rule

When the user asks for a feature, first decide whether it is actually:

- a host runtime capability that already exists
- a module concern
- a theme concern
- an operational concern

That decision usually changes which docs and files matter next.
