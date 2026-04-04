---
title: "Checkout Change Checklist"
sidebar_position: 0
---

# Checkout Change Checklist

Use this page when changing checkout behavior for subscription purchases or
subscription transitions.

## Scope

This checklist applies to:

- checkout endpoints under `app/api/checkout/*`
- lifecycle projection in `lib/payments/order-subscription-events.ts`
- subscription policy classification in `lib/payments/subscription-policy.ts`

## Pre-Change Checklist

Confirm the expected transition matrix for:

- `same_template`
- `upgrade`
- `downgrade`
- `lateral_change`
- `new_purchase`

Also confirm:

- target scope alignment still holds
- active/trial assignment selection remains deterministic

## Implementation Checklist

Check these files when the contract changes:

- `lib/payments/checkout-system.ts`
- `lib/payments/payment-methods.ts`
- `lib/payments/order-subscription-events.ts`
- `lib/payments/subscription-policy.ts`
- `lib/payments/order-metadata.ts`

Practical rule:

- if order metadata shape changes, serializers and parsers must change in the
  same task

## Validation Checklist

Run targeted lifecycle and checkout tests:

```bash
npx tsx --test tests/payments/order-subscription-lifecycle.test.ts
```

Other high-signal tests to consider:

- `tests/payments/subscription-change.test.ts`
- `tests/payments/subscription-checkout-scope-guard.test.ts`
- `tests/payments/subscription-return-guard.test.ts`
- `tests/payments/checkout-system-webhook-replay.test.ts`

## UI Regression Checklist

Confirm no regressions in:

- `/admin/subscriptions`
- `/admin/subscriptions/templates`
- `/admin/orders`
- `/admin/payments`
- `/dashboard/subscriptions`

## Module Rule

If a module owns checkout integrations on top of the shared platform, validate
those from the module test suite as well. Do not treat core payment tests as
complete module coverage.

## Common Mistakes

- validating provider callbacks without validating lifecycle projection
- validating lifecycle projection without validating admin/dashboard surfaces
- changing checkout metadata without updating parsers
- testing only the happy path and not replay/provider-pending behavior

## Related Docs

- `./payment-lifecycle.md`
- `./dashboard-management.md`
- `../checkout-side-effects-playbook.md`
