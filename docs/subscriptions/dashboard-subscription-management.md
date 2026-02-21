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
- Organization config limits:
  - `getOrganizationLimits()` in `lib/organizations/config.ts`
- Subscription feature quota limit:
  - `getCurrentUserOrganizationLimitBySubscription()` in
    `lib/organizations/subscription-limits.ts`

## Multi-organization effective limit

Effective user organization limit is resolved with:

1. App config:
   - `allow_multi_organizations`
   - `max_organizations_per_user`
2. User subscription quota:
   - `dashboard.user.organizations.max`

If both max limits exist, the effective limit is the minimum of both.

## Scope handling

- User subscription = scope `user`
- Team/organization subscriptions = scope `organization`

Payment/order scope resolution relies on explicit target columns:

- `payment_orders.target_type`
- `payment_orders.target_team_id`
- `payment_orders.target_user_id`

## Related test

- `tests/payments/order-subscription-lifecycle.test.ts`

