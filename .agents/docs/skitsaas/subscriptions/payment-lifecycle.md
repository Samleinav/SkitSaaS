---
title: "Payment Lifecycle"
sidebar_position: 0
---

# Payment Lifecycle

Use this page when the task depends on how checkout, webhooks, and admin order
flows converge into one subscription lifecycle.

## Objectives

The lifecycle pipeline is designed to:

- centralize payment event writes
- keep checkout-attempt traces append-only before settlement
- avoid duplicating status-sync logic across providers and admin flows
- apply deterministic subscription lifecycle mutations from order status
- keep operational evidence in activity and payment logs

## Core Components

### Checkout Event Recorder

Main file:

- `lib/payments/checkout-system.ts`

Important API:

- `recordCheckoutEvent(...)`

Responsibilities:

- persist payment log rows
- upsert payment-order state
- run lifecycle projection for actionable subscription states

For `orderType='one_time'`, subscription lifecycle projection is intentionally
skipped.

### Checkout Payment Attempt Log

Main files:

- `lib/payments/attempt-logs.ts`
- `lib/payments/payment-methods.ts`

Main table:

- `checkout_payment_attempt_logs`

Purpose:

- capture orchestration events before settlement
- distinguish request/callback/webhook transitions
- keep replay and provider-pending traces visible

Important distinction:

- `checkout_payment_attempt_logs`
  checkout orchestration trace
- `payment_orders`
  operational provider/order timeline
- `payment_logs`
  raw provider event audit

### Signup Intent Finalizer

Main file:

- `lib/payments/signup-intents.ts`

Purpose:

- persist `signup_intents` for paid public signup before a real account exists
- link that intent to a targetless subscription checkout order
- finalize the real `user` / `team` only after return or webhook convergence

### Provider Adapters

Main file:

- `lib/payments/checkout-system.ts`

Current high-signal adapters:

- `recordStripeCheckoutEvent(...)`
- `recordPayPalCheckoutEvent(...)`
- `recordSystemCheckoutEvent(...)`

### Subscription Lifecycle Executor

Main file:

- `lib/payments/order-subscription-events.ts`

Important API:

- `runPaymentOrderSubscriptionLifecycle(...)`

Trigger sources:

- checkout/webhook pipeline
- admin manual order create
- admin manual order edit

## Status-To-Lifecycle Rules

Current default mental model:

- `pending`
  no lifecycle mutation
- `received`
  activate target subscription
- `failed`
  close the paid assignment and move the target to the reserved default tier for that scope
- `canceled`
  close the paid assignment and move the target to the reserved default tier for that scope

Provider status preservation:

- provider `trialing` subscription status is actionable and maps to a
  `received` order
- lifecycle projection preserves provider `trialing` as a `trialing`
  subscription assignment
- Stripe and PayPal subscription event metadata should carry
  `subscriptionStatus` so return-first and webhook-first paths converge the
  same way

Fallback policy:

- `user`
  reserved default user tier (`subscription_templates.id = 1`)
- `team`
  reserved default organization tier (`subscription_templates.id = 2`)
- fallback status is `free` only when the reserved default tier price is `0`;
  otherwise the replacement assignment is `unpaid`

Important boundary:

- failed or canceled `signup_intent` checkouts do not create fallback accounts
- fallback applies only after a real target assignment exists

The lifecycle layer is what turns order state into subscription state. Do not
copy that logic into every provider or admin action.

## Scheduled Subscription Changes

Main table:

- `subscription_change_requests`

Supported modes:

- `period_end`
- `immediate`

Worker:

```bash
pnpm subscriptions:change-requests
```

Practical rule:

- if checkout metadata schedules a future subscription change, lifecycle should
  not immediately activate the requested template

## Target Resolution

Lifecycle target resolution follows this priority:

1. explicit target metadata
2. order `teamId`
3. parsed checkout/provider metadata

Supported targets:

- `team`
- `user`

Signup-intent note:

- paid public signup orders can temporarily have no concrete target ids
- effective scope is derived from the signup-intent metadata until finalization

This is why order target columns and metadata must stay consistent.

## Shared Metadata Envelope

Checkout events normalize and persist shared context under `checkoutContext`.

High-value fields include:

- `provider`
- `eventType`
- `source`
- `identifiers.externalOrderId`
- `identifiers.externalPaymentId`
- `identifiers.externalLogId`
- `providerMetadata`

Practical rule:

- if metadata shape changes, lifecycle, provider adapters, and order parsers
  must stay aligned
- provider period metadata (`currentPeriodStart`, `currentPeriodEnd`,
  `trialEndsAt`, `cancelAtPeriodEnd`, `canceledAt`) must be preserved into
  subscription assignments when present

## Flow Examples

### Stripe Or PayPal Callback/Webhook

Safe mental model:

1. provider callback or webhook arrives
2. adapter normalizes the event
3. `recordCheckoutEvent(...)` persists order/log state
4. lifecycle executor projects subscription changes when the order status is
   actionable

Security rules:

- existing-user Stripe subscription returns require an authenticated user whose
  id matches Stripe `client_reference_id`; do not mint sessions from those
  callbacks
- existing-user PayPal user-scope subscription returns require the authenticated
  user id to match the checkout target user
- PayPal subscription returns must validate provider `custom_id` against the
  expected checkout target/signup-intent custom id and validate provider plan id
  against the local template plan ids before marking the checkout order
  provider-pending or completed
- only paid `signup_intent` finalizers may create the new dashboard session
  after successful checkout
- PayPal webhooks require `PAYPAL_WEBHOOK_ID` signature verification in
  production-like runtimes or when `PAYPAL_ENVIRONMENT` is `production`/`live`;
  unsigned processing is only for sandbox/local diagnostics

### Admin Manual Subscription Order

Safe mental model:

1. admin form creates or edits `payment_orders`
2. target metadata is persisted
3. `runPaymentOrderSubscriptionLifecycle(...)` is called
4. assignment changes are logged and projected

### Failed Or Canceled Order

Safe mental model:

1. lifecycle executor sees `failed` or `canceled`
2. active paid assignment is closed for the target
3. the reserved default tier for the same scope is activated immediately after:
   - `id=1` for `user`
   - `id=2` for `organization`
4. feature/quota reads continue from an explicit template instead of `null`

For paid public signup:

1. sign-up stores a `signup_intent` plus checkout order instead of creating a user/team immediately
2. provider return or webhook finalizes the intent after successful payment
3. only then are the real user/team and purchased assignment created

## Dashboard And Admin Surfaces

Important UI surfaces:

- `/dashboard/subscriptions`
- `/admin/subscriptions`
- `/admin/subscriptions/templates`
- `/admin/orders`
- `/admin/payments`

Practical rule:

- lifecycle work should be validated against both admin and dashboard
  subscription surfaces, not only provider callbacks

## Tests Worth Knowing

High-signal tests include:

- `tests/payments/order-subscription-lifecycle.test.ts`
- `tests/payments/checkout-system-webhook-replay.test.ts`
- `tests/payments/subscription-change.test.ts`
- `tests/payments/subscription-single-writer.test.ts`
- `tests/payments/checkout-payment-attempt-logs.test.ts`

## Common Mistakes

- duplicating lifecycle projection rules inside provider-specific code
- treating checkout attempt logs as if they were the same as settlement logs
- changing order metadata shape without updating parsers and lifecycle logic
- validating webhook behavior without checking admin/dashboard subscription
  surfaces

## Related Docs

- `../subscriptions-and-features.md`
- `../checkout-side-effects-playbook.md`
- `./dashboard-management.md`
- `./checkout-change-checklist.md`
