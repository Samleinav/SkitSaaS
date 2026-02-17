---
title: Checkout Subscription Change Checklist
sidebar_position: 16
---

# Checkout Subscription Change Checklist

Prepare checkout to support **upgrades, downgrades, and payment-method changes**
using **carryover Option A** (change starts at current period end).

Scope: **checkout + UI hooks for testing** (pricing + dashboard + admin visibility).

## Decision: Carryover Option A (period-end)

- Keep the current subscription active until `current_period_end`.
- Create a change request that becomes effective at period end.
- New subscription starts at `effective_at` (no double-billing).

## Change modes (supported)

- `period_end` (default): apply at end of current period.
- `immediate`: apply now (useful for instant upgrade/downgrade).

## Checklist

### 1) Data model (required)

- [x] Add period tracking fields to `subscription_assignments`
  - `current_period_start`, `current_period_end`, `trial_ends_at`
  - `cancel_at_period_end`, `canceled_at`
- [x] Add `subscription_change_requests` table
  - target, current assignment, requested template/provider/method
  - `effective_at`, `change_mode`, `status`, metadata

### 2) Checkout change request helpers

- [x] Add carryover planner (effective date + carryover days).
- [x] Add helper to create a change request record.

### 3) Provider capture (next)

- [x] Stripe: persist `current_period_start/end`, `trial_end`,
  `cancel_at_period_end`, `canceled_at` from webhook events.
- [x] PayPal: persist `billing_info.next_billing_time`
  (or equivalent) when available.

### 4) Checkout flow (next)

- [x] Detect active assignment on checkout.
- [x] If active and `changeMode=period_end`, create `subscription_change_requests`.
- [x] Use `effective_at` for provider scheduling (Stripe trial end / PayPal start time).

Notes:

- `/pricing?changeMode=period_end` uses scheduled checkout for testing.
- PayPal plan ids are created on demand from subscription templates (no static env mapping).

### 4.1) UI hooks for testing (pricing + dashboard + admin)

- [x] Pricing shows a change-mode selector (immediate vs period end).
- [x] Pricing lets the user pick the payment method (Stripe / PayPal) before checkout.
- [x] Dashboard exposes quick links to run upgrade/downgrade flows.
- [x] Admin subscription edit shows period metadata (for validation).

### 5) Subscription scheduling (next)

- [x] Background job/cron to apply due change requests.
- [x] Ensure old subscription is canceled **at** period end (internal assignment).
- [x] Create new subscription starting at `effective_at` (internal assignment).
  - Provider-level cancellation/creation still pending (checkout flow work).

Command:

```
pnpm subscriptions:change-requests
```

### 6) Tests + evidence (next)

- [ ] Add provider event fixture tests for period fields.
- [ ] Add canary checks for pending change requests.
- [ ] Add ops evidence samples for change requests.

## Exit criteria

- Schema is migrated.
- Carryover planner + change request helper exist.
- No regression in existing checkout/order lifecycle flows.
- Pricing can trigger checkout with payment-method + change-mode selection.
