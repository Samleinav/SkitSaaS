---
title: Payment Events and Subscription Lifecycle
sidebar_position: 2
---

# Payment Events and Subscription Lifecycle

This guide documents the technical event pipeline used by checkout, webhooks, and manual admin order create/update flows.

## Objectives

- Centralize payment event writes (`payment_logs`, `payment_orders`)
- Keep an append-only checkout-attempt trace before operational payment settlement
- Avoid duplicating status-sync logic across Stripe/PayPal/Admin flows
- Apply deterministic subscription lifecycle changes from order status
- Keep auditable traces in `sys_activity_logs`

## Core components

### 1) Checkout event recorder

File: `lib/payments/checkout-system.ts`

- Main API: `recordCheckoutEvent(...)`
- Persists:
  - payment log (`createPaymentLog`)
  - payment order (`upsertPaymentOrder`)
- For actionable statuses (`received`, `canceled`, `failed`), executes:
  - `runPaymentOrderSubscriptionLifecycle(...)`
  - For `orderType='one_time'`, lifecycle projection is skipped by design.

### 1.5) Checkout payment attempt log

Files:

- `lib/payments/attempt-logs.ts`
- `lib/payments/payment-methods.ts`

Purpose:

- capture pre-settlement checkout orchestration events such as:
  - `start_requested`
  - `start_succeeded`
  - `start_failed`
  - `reused_pending_start`
  - `return_received`
  - `webhook_received`
  - `transition_provider_pending`
  - `transition_completed`
  - `transition_failed`
  - `transition_canceled`

Table:

- `checkout_payment_attempt_logs`

This table is intentionally separate from `payment_orders` and `payment_logs`:

- `checkout_payment_attempt_logs` = checkout orchestration trace
- `payment_orders` = operational provider/order timeline
- `payment_logs` = raw provider event audit

Recent callback attempt outcomes are now classified explicitly in the attempt/telemetry layer instead of only as generic `*_succeeded`:

- `*_provider_pending`
- `*_ignored`
- `*_replayed`
- `*_failed`
- `*_succeeded`

Operational review:

- `/admin/payments` now includes a recent checkout callback summary backed by `checkout_payment_attempt_logs`, so admins can distinguish replayed, provider-pending, failed, ignored, and succeeded callbacks without inspecting raw metadata first.
- `/admin/logs?tab=checkout` now exposes the same callback-attempt source as a dedicated searchable/filterable admin log table when operators want the full trace list instead of the compact payments summary.

### 1.75) Signup intent finalizer

File: `lib/payments/signup-intents.ts`

- Persists `signup_intents` for paid public signup before a real account exists.
- Links a public signup request to a targetless subscription `checkout_order`.
- Finalizes the purchased subscription into a real `user` / `team` only after checkout converges through a provider return or webhook.

### 2) Provider adapters

File: `lib/payments/checkout-system.ts`

- `recordStripeCheckoutEvent(...)`
- `recordPayPalCheckoutEvent(...)`
- `recordSystemCheckoutEvent(...)`
- Adapter factory for new providers:
  - `createCheckoutEventProviderAdapter(...)`

### 3) Subscription lifecycle executor

File: `lib/payments/order-subscription-events.ts`

- Main API: `runPaymentOrderSubscriptionLifecycle(...)`
- Triggered by:
  - checkout/webhook pipeline via `recordCheckoutEvent(...)`
  - admin manual order create via `createPaymentOrderAction`
  - admin manual order edit via `updatePaymentOrderAction`
- Writes audit events with:
  - `eventType = payments.order.subscription.lifecycle`

## Status-to-lifecycle rules

- `pending` -> no lifecycle mutation
- `received` -> activate target subscription
- `failed` -> close the current paid assignment and move the target to the reserved default tier for its scope
- `canceled` -> close the current paid assignment and move the target to the reserved default tier for its scope

Provider status preservation:

- Provider `trialing` subscription status maps to an actionable `received`
  order and is preserved as a `trialing` subscription assignment.
- Provider metadata stores `subscriptionStatus` for Stripe and PayPal
  subscription events so lifecycle projection can distinguish `trialing` from
  plain active purchases.

Fallback policy:

- `user` target -> reserved default `user` template (`subscription_templates.id = 1`)
- `team` target -> reserved default `organization` template (`subscription_templates.id = 2`)

Important boundary:

- Failed or canceled `signup_intent` checkouts do not create fallback users/teams.
- Fallback applies only after a real target assignment exists.

## Scheduled subscription changes (carryover + immediate)

Table: `subscription_change_requests`

Supported modes:

- `period_end` (default): apply when `effective_at` <= now.
- `immediate`: apply immediately (worker sets `effective_at` if missing).

Worker:

```
pnpm subscriptions:change-requests
```

When a checkout order includes `metadata.subscriptionChange.mode = "period_end"` and
`requestId`, the lifecycle executor skips immediate activation and logs
`reason = change_scheduled`.

## Target resolution

Resolution priority in lifecycle executor:

1. Explicit target metadata (`targetType`, `userId`, `teamId`)
2. Order `teamId`
3. Parsed metadata from `checkoutContext` / system provider metadata

Supported targets:

- `team` (organization scope)
- `user` (user scope, metadata-targeted flows)

Signup-intent note:

- Paid public signup checkouts temporarily have no concrete `teamId` / `userId`.
- Their effective scope comes from `metadata.signupIntent.targetScope` until finalization creates the real target.

## Metadata envelope (`checkoutContext`)

All checkout events normalize metadata and persist a shared context:

```json
{
  "checkoutContext": {
    "schemaVersion": 1,
    "provider": "stripe",
    "eventType": "customer.subscription.updated",
    "source": "webhook",
    "identifiers": {
      "externalOrderId": "evt_...",
      "externalPaymentId": "sub_...",
      "externalLogId": "evt_...",
      "providerPlanId": "price_..."
    },
    "providerMetadata": {
      "stripe": {
        "subscriptionId": "sub_...",
        "webhookEventId": "evt_..."
      }
    }
  }
}
```

Notes:

- `paymentMethod` on each order captures the provider-specific method (e.g. `card`, `paypal`).
- Provider period metadata (`currentPeriodStart`, `currentPeriodEnd`,
  `trialEndsAt`, `cancelAtPeriodEnd`, `canceledAt`) is projected into active
  subscription assignments when present, so billing-cycle state remains visible
  after checkout return, webhook, and admin-order lifecycle runs.

## Flow examples

### Example A: Stripe webhook updates subscription

1. `app/api/stripe/webhook/route.ts` processes webhook
2. Calls `recordStripeCheckoutEvent(...)`
3. `recordCheckoutEvent(...)` stores order/log
4. Lifecycle executor activates/suspends the organization depending on mapped status

### Core return callbacks

- `GET|POST /api/checkout/methods/[paymentMethodId]/return` now executes the core provider return action directly from the dispatcher runtime.
- In practice, Stripe and PayPal both resolve through that same dispatcher path with their own `paymentMethodId`.
- For `one_time` checkout:
  - Stripe confirms `mode='payment'` sessions from the same return action.
  - Stripe now also reuses an already completed local one-time checkout order when the browser return arrives after a webhook-first completion for the same session/payment intent.
  - PayPal reconciles the current provider order state first and only captures server-created Orders when the order is still `APPROVED`.
  - If PayPal already shows the order as completed, the return action reuses that provider state instead of forcing a second capture attempt.
  - If PayPal reports `PENDING` after capture/reconciliation, the checkout stays in `provider_pending` instead of being downgraded to `failed`.
- For `subscription` checkout:
  - Stripe and PayPal now also reuse an already completed local checkout order when the browser return is replayed with matching provider identifiers.
  - A mismatched PayPal subscription callback against an already completed checkout order now returns a conflict instead of silently re-projecting the order.
  - Existing-user Stripe subscription returns require an authenticated user
    whose id matches the Stripe session `client_reference_id`. These returns do
    not create or replace browser sessions; only paid `signup_intent` finalizers
    create the new dashboard session after payment success.
  - Existing-user PayPal user-scope subscription returns require an
    authenticated user whose id matches the checkout target user.
  - PayPal subscription returns validate the provider subscription `custom_id`
    against the checkout target or signup-intent custom id and validate the
    provider plan id against the local template plan ids before mutating local
    checkout order state.
  - For `signup_intent` subscription checkout, guest browser return is allowed for the matching checkout token and finalizes the real user/team plus dashboard session after payment success.
- Legacy routes:
  - `/api/stripe/checkout`
  - `/api/paypal/checkout`
  remain as compatibility wrappers that log legacy usage and then delegate to the same shared core return helpers.

### Core webhook callbacks

- `POST /api/checkout/methods/[paymentMethodId]/webhook` now executes the core provider webhook action directly from the dispatcher runtime.
- In practice, Stripe and PayPal both resolve through that same dispatcher path with their own `paymentMethodId`.
- Core webhook handlers now promote provider webhook ids into `externalLogId` when available, so retries can be audited and settlement dedupe has a stable provider event identifier.
- Core webhook handlers persist provider subscription status into checkout
  metadata so webhook-first `trialing` subscriptions project the same
  assignment state as browser-return-first flows.
- PayPal webhook signature verification is required when the runtime is
  production-like (`NODE_ENV=production`, `VERCEL_ENV=production`, or
  `APP_ENV=production`) or when `PAYPAL_ENVIRONMENT` is `production`/`live`.
  Configure `PAYPAL_WEBHOOK_ID` before enabling PayPal webhooks in those
  environments. Missing webhook ids are allowed only for sandbox/local
  diagnostics.
- Settlement webhook replays are now short-circuited by `provider + externalLogId` against `payment_transactions.provider_event_id`:
  - repeated deliveries still append a `payment_logs` audit row
  - duplicate material effects are skipped (`checkoutBeforeCreateOrder`, order status hooks, lifecycle projection, settlement transaction event)
- Stripe core webhook handling now also recognizes one-time `checkout.session.completed` payment-mode events.
- PayPal core webhook handling now also recognizes one-time capture events:
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.PENDING`
  - `PAYMENT.CAPTURE.DENIED`
- PayPal one-time browser return is idempotent against a webhook-first completion: if the webhook already marked the checkout order as completed, the return path reuses that result instead of failing the checkout.
- One-time core webhook handlers now also short-circuit when the local `checkout_order` is already converged in the same provider state (`provider_pending`, `completed`, or `failed`) for the same provider session/reference ids. That keeps webhook retries auditable through `checkout.webhook.received` and `payment_logs`, but avoids repeating order transitions and checkout event projection.
- `CHECKOUT.ORDER.APPROVED` is intentionally not auto-captured from webhook yet; capture still happens from the canonical return flow to avoid racing the browser return until that path is fully normalized.
- Paid signup `signup_intent` subscription checkouts can also be finalized from the webhook path when settlement arrives before the browser return. The later browser return then reuses the already-converged local result and only restores session state.
- Legacy routes:
  - `/api/stripe/webhook`
  - `/api/paypal/webhook`
  remain as compatibility wrappers that log legacy usage and then delegate to the same shared core webhook helpers.

### Example B: Admin manually creates subscription order with `received` status

1. `app/(dashboard)/admin/orders/actions.ts` inserts into `payment_orders`
2. The admin form sets target type (`team` or `user`) and stores target metadata
3. Calls `runPaymentOrderSubscriptionLifecycle(...)`
4. Target subscription is activated and logged in `sys_activity_logs`

### Example C: Admin manually edits existing order

1. `app/(dashboard)/admin/orders/actions.ts` updates `payment_orders`
2. Calls `runPaymentOrderSubscriptionLifecycle(...)`
3. Changes are logged in `payment_logs` + `sys_activity_logs`

### Example D: Order becomes `failed` or `canceled`

Lifecycle executor closes the active paid assignment and immediately activates
the reserved default tier for the same scope:

- team -> default `organization` template (`subscription_templates.id = 2`)
- user -> default `user` template (`subscription_templates.id = 1`)

Those default tiers can be public pricing plans when published. If the default
tier is `published` and `price_cents = 0`, it is also the public free tier for
that scope. If it is `draft`, it remains an internal fallback only. Fallback
assignments use status `free` only for zero-cost default tiers; paid default
tiers are assigned as `unpaid` recovery/default access.

## Admin subscriptions visibility

Routes:

- `/admin/subscriptions` (active assignments operations)
- `/admin/subscriptions/templates` (template catalog management)
- `/admin/suscriptions` remains as a legacy redirect to `/admin/subscriptions`

- The admin subscriptions table is order-backed.
- A row is shown only if there is at least one persisted subscription order for that target.
- Eligible orders are checkout/webhook/manual admin orders with:
  - `subscriptionTemplateId != null`
  - provider in payment providers (`stripe`/`paypal`)
  - source in `checkout`, `webhook`, or `dashboard`
- Once shown, the row stays visible even if later order statuses move to `canceled` or `failed`.
- Recommended entrypoint for new rows is creating a new order (`/admin/orders/create`).

## Extending for a new provider

1. Create adapter with `createCheckoutEventProviderAdapter(...)`
2. Pass provider-specific metadata normalizer
3. Emit events through `recordCheckoutEvent(...)` with mapped order status
4. Reuse existing lifecycle executor (no new sync logic needed)

## Related files

- `lib/payments/attempt-logs.ts`
- `lib/payments/checkout-system.ts`
- `lib/payments/order-subscription-events.ts`
- `lib/payments/orders.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/paypal/webhook/route.ts`
- `app/(dashboard)/admin/orders/actions.ts`
