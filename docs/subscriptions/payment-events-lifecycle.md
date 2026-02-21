---
title: Payment Events and Subscription Lifecycle
sidebar_position: 2
---

# Payment Events and Subscription Lifecycle

This guide documents the technical event pipeline used by checkout, webhooks, and manual admin order create/update flows.

## Objectives

- Centralize payment event writes (`payment_logs`, `payment_orders`)
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
- `failed` -> suspend target subscription (clear paid assignment)
- `canceled` -> suspend target subscription (clear paid assignment)

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

## Flow examples

### Example A: Stripe webhook updates subscription

1. `app/api/stripe/webhook/route.ts` processes webhook
2. Calls `recordStripeCheckoutEvent(...)`
3. `recordCheckoutEvent(...)` stores order/log
4. Lifecycle executor activates/suspends the organization depending on mapped status

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

Lifecycle executor closes the active subscription assignment so feature/quota logic falls back to free:

- team: closes the active assignment (`effective_to` set, status -> `unpaid`/`canceled`)
- user: closes the active assignment (`effective_to` set, status -> `unpaid`/`canceled`)

### Example E: Extension module one-time webhook

1. A module webhook handler under `app/api/modules/[moduleId]/[[...slug]]` verifies provider signature and resolves module intent state.
2. The module applies fulfillment transition guards (`pending/session_created -> paid/failed/canceled`).
3. The module writes core order evidence through `recordCheckoutEvent(...)` with `orderType='one_time'`.
4. Core settlement transaction write-through is still applied (`payment_transactions`).
5. Subscription lifecycle projector is skipped because order type is not `subscription`.

Module-specific implementation details must stay in the module's own documentation (`modules/<moduleId>/README.md`).

## Admin subscriptions visibility

Routes:

- `/admin/suscriptions` (active assignments operations)
- `/admin/subscriptions` (template catalog management)

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

- `lib/payments/checkout-system.ts`
- `lib/payments/order-subscription-events.ts`
- `lib/payments/orders.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/paypal/webhook/route.ts`
- `app/(dashboard)/admin/orders/actions.ts`

