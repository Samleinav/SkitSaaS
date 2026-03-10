---
name: core-payments-subscriptions
description: Modify billing, subscription lifecycle, checkout flow, or admin dashboard for subscription management. Use this skill when adding payment events, changing subscription states, configuring pricing plans, or building admin subscription UI.
---

# core-payments-subscriptions

## Scope

Stripe integration, subscription lifecycle states, checkout flow, subscription template admin UI, email system, and payment event hooks.

## Required References

- `docs/subscriptions/features-and-quotas.md` — feature flags, quota enforcement, plan-based access (host-side)
- `docs/subscriptions/payment-events-lifecycle.md` — payment event hooks, subscription state machine
- `docs/subscriptions/dashboard-subscription-management.md` — user-facing subscription management
- `docs/subscriptions/checkout-subscription-change-checklist.md` — checkout flow checklist
- `docs/operations/admin-dashboard.md` — admin dashboard subscription section
- `docs/operations/email-system.md` — transactional email triggers

## Key Tables

| Table | Purpose |
|-------|---------|
| `subscription_templates` | Plan definitions (features, pricing, limits) |
| `subscription_template_features` | Feature flags per plan |
| `subscription_assignments` | User/team → plan assignments |
| `payment_orders` | Payment records |

## Feature Flags and Quotas (Host-Only)

`getDashboardFeatureController` and `getCurrentFeatureControllerByScope` are **host-only helpers**. They read from `subscription_template_features` + `subscription_assignments` and must not be exposed to module code without an SDK adapter.

When adding a new feature flag:
1. Add to `subscription_template_features` schema.
2. Add to the feature controller logic.
3. If modules need to check this flag → create an SDK gap entry and escalate to `core-sdk-evolution`.

## Payment Event Hooks

Stripe webhook events map to internal hooks via `emitEvent`. Key hooks:

- `payment.checkout.completed`
- `payment.subscription.created`
- `payment.subscription.updated`
- `payment.subscription.cancelled`

Wire new Stripe events in `lib/payments/webhook-handler.ts`. Emit using `emitEvent` from `@/lib/events/bus`.

## Subscription Template Admin Forms

Admin forms for subscription templates use the host FormBuilder pattern (registered forms):
- Form factory in `app/(dashboard)/admin/subscriptions/forms.ts`
- Registered in `lib/forms/registry-catalog.ts`
- Action in `lib/forms/registry.ts`

## Email Triggers

Email notifications for payment events are configured in `lib/notifications/email-templates/`. Add new email triggers in response to event hooks, not directly in webhook handlers.

## Verification

```bash
pnpm exec tsc --noEmit
# Test webhook handler locally with Stripe CLI:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
