---
title: "Hook Emitters Checklist"
sidebar_position: 0
---

# Hook Emitters Checklist

This page records where the current hook catalog is emitted in the codebase so
agents and developers do not have to rediscover the same map by grep.

## Source Of Truth

Canonical hook names live in:

- `app/sdk/src/events/catalog.ts`

The fastest runtime audit commands are:

```bash
rg -n "EVENT_HOOKS\\." app lib scripts
rg -n "emitEventAsync\\(|emitEvent\\(" app lib scripts
```

When operational audit events are written directly instead of going through the
event bus, also check:

```bash
rg -n "eventType:" app lib scripts
```

## Auth And Account Emitters

Main file:

- `app/(login)/actions.ts`

Current hook families emitted there:

- auth sign-in attempt, success, and failure
- auth sign-up before/create/fail
- invitation accepted
- team created
- sign-out
- password reset requested and completed
- dashboard account updated, password updated, deleted
- dashboard team member invited and removed
- dashboard teams created

Additional dashboard account emitters also exist in:

- `app/(dashboard)/dashboard/general/actions.ts`
- `app/(dashboard)/dashboard/security/actions.ts`

## Dashboard Subscription Emitters

Main file:

- `app/(dashboard)/dashboard/subscriptions/actions.ts`

Current families:

- organization cancel requested
- organization canceled
- user cancel requested
- user canceled
- subscription portal opened

## Admin Emitters

### Users

- `app/(dashboard)/admin/users/actions.ts`

Hooks:

- `admin.users.created`
- `admin.users.updated`
- `admin.users.status_changed`
- `admin.users.deleted`

### Orders

- `app/(dashboard)/admin/orders/actions.ts`

Hooks:

- `admin.orders.before_create`
- `admin.orders.created`
- `admin.orders.before_update`
- `admin.orders.updated`

### Subscriptions And Templates

- `app/(dashboard)/admin/subscriptions/actions.ts`

Hooks:

- template created and updated
- template pricing changed
- active subscription update requested
- organization subscription updated and cleared
- user subscription updated

### App Config And Nav Composition

- `app/(dashboard)/admin/app-config/actions.ts`
- `app/(dashboard)/admin/app-config/section-nav.tsx`
- `app/(dashboard)/admin/layout.tsx`
- `app/(dashboard)/dashboard/layout.tsx`

Hooks:

- app config updated
- payments config updated
- email config updated
- app-config sections compose
- admin nav items compose
- dashboard nav items compose

## Checkout, Payments, And Subscription Lifecycle Emitters

### Checkout Start And Order Recording

- `lib/payments/stripe.ts`
- `lib/payments/checkout-system.ts`
- `lib/payments/core-return-actions.ts`

Current families:

- checkout session create before/after
- checkout before create order
- checkout after create order
- checkout change request created
- payment order status changed

### Webhooks

- `lib/payments/core-webhook-actions.ts`

Current families:

- checkout webhook received
- checkout webhook processed
- checkout webhook failed

### Order Lifecycle And Transactions

- `lib/payments/order-subscription-events.ts`
- `lib/payments/transactions.ts`

Current families:

- payment order lifecycle applied
- payment transaction recorded

### Subscription Assignment And Change Requests

- `lib/payments/subscription-assignments.ts`
- `lib/payments/subscription-change.ts`
- `scripts/subscription-change-worker.ts`

Current families:

- assignment activated
- assignment suspended
- assignment canceled
- change request created
- change request applied
- change request failed

## Delivery Emitters

Main file:

- `lib/email/smtp.ts`

Current families:

- `email.smtp.before_send`
- `email.smtp.sent`
- `email.smtp.failed`

## Maintenance Workflow

When adding or changing a hook:

1. update `app/sdk/src/events/catalog.ts`
2. add or update the actual emitter
3. update this checklist
4. update any affected playbook or module docs
5. verify whether the hook should also produce persisted notifications or audit
   log expectations

## Common Mistakes

- documenting only the hook name without the emitter file
- forgetting that `/api` lifecycle hooks often live in `lib/payments/*`, not in
  route files directly
- assuming every audit event uses the event bus when some slices write
  `eventType` directly for system activity

## Related Docs

- `../events-and-hooks.md`
- `../notifications-and-delivery.md`
- `../subscriptions/payment-lifecycle.md`
