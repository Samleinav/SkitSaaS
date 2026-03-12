---
title: Checkout Subscription Change Checklist
sidebar_position: 4
description: Validation checklist for subscription change flows in checkout and lifecycle projection.
---

# Checkout Subscription Change Checklist

Use this checklist when changing checkout behavior for subscription purchases (new, upgrade, downgrade, lateral change, cancellation-at-period-end interactions).

## Scope

- Applies to checkout endpoints under `app/api/checkout/*`.
- Applies to lifecycle projection in `lib/payments/order-subscription-events.ts`.
- Applies to policy classification in `lib/payments/subscription-policy.ts`.

## Pre-Change Checklist

- Confirm expected transition matrix for:
  - `same_template`
  - `upgrade`
  - `downgrade`
  - `lateral_change`
  - `new_purchase`
- Confirm target scope alignment (`user` vs `organization`) remains enforced.
- Confirm active/trial assignment selection queries still return deterministic ordering.

## Implementation Checklist

- Update checkout orchestration logic in `lib/payments/checkout-system.ts` if API contract changed.
- Update payment-method dispatch logic in `lib/payments/payment-methods.ts` if provider behavior changed.
- Update lifecycle projection rules in `lib/payments/order-subscription-events.ts`.
- Update policy helpers in `lib/payments/subscription-policy.ts` if classification rules changed.
- If order metadata shape changed, update serializers/parsers in `lib/payments/*`.

## Validation Checklist

- Run targeted lifecycle and checkout tests:

```bash
npx tsx --test tests/payments/order-subscription-lifecycle.test.ts tests/payments/checkout-system-one-time.test.ts
```

- If module checkout integrations are touched, also run:

```bash
npx tsx --test tests/modules/mod-commerce-onetime-api.test.ts tests/modules/mod-commerce-onetime-validation.test.ts tests/modules/mod-commerce-onetime-stripe-webhook.test.ts tests/modules/mod-commerce-onetime-paypal-webhook.test.ts
```

- Confirm no regressions in admin/dashboard subscription pages:
  - `app/(dashboard)/admin/subscriptions/*`
  - `app/(dashboard)/admin/subscriptions/templates/*`
  - `app/(dashboard)/admin/suscriptions/*` (legacy redirects/shims)
  - `app/(dashboard)/dashboard/subscriptions/*`

## Related References

- [Payment Events and Subscription Lifecycle](./payment-events-lifecycle.md)
- [Dashboard Subscription Management](./dashboard-subscription-management.md)
- Module-specific one-time payments runbook:
  - `modules/mod.commerce.one-time-payments/README.md`

