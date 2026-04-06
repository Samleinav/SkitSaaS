---
title: Dashboard Subscription Management
sidebar_position: 3
---

# Dashboard Subscription Management

Technical guide for `/dashboard/subscriptions`.

## Purpose

Expose a user-facing subscription control panel where users can:

- review their user-scope subscription
- review organization/team subscriptions where they are members
- filter the view by a specific team
- open Stripe portal for owner teams
- cancel PayPal subscriptions for owner teams
- review payment events and invoice-style history

## Route and actions

- Route: `app/(dashboard)/dashboard/subscriptions/page.tsx`
- Actions: `app/(dashboard)/dashboard/subscriptions/actions.ts`
  - `manageOrganizationSubscriptionAction`
  - `cancelUserSubscriptionAction`
- Client datatables:
  - `app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx`
  - `app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx`

Both actions use `dashboardAction(...)` from `app/(dashboard)/dashboard/controller.ts`.

## Data sources

- Main dashboard payload:
  - `getCurrentUserSubscriptionManagementData()` in `lib/db/queries.ts`
- Subscription feature quota limit:
  - `getCurrentUserOrganizationLimitBySubscription()` in
    `lib/organizations/subscription-limits.ts`

## User organization limit

The dashboard surface now presents the user organization limit from the active
user subscription template:

- `dashboard.user.organizations.max`

Core count quota semantics:

- `-1` = unlimited
- `1..N` = finite limit
- `0` is not a valid stored value for this managed key

## Scope handling

- User subscription = scope `user`
- Team/organization subscriptions = scope `organization`

Payment/order scope resolution relies on explicit target columns:

- `payment_orders.target_type`
- `payment_orders.target_team_id`
- `payment_orders.target_user_id`

## Related test

- `tests/payments/order-subscription-lifecycle.test.ts`
