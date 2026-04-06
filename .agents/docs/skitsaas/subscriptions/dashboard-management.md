---
title: "Dashboard Management"
sidebar_position: 0
---

# Dashboard Management

Use this page when the task is about the user-facing subscription control panel
under `/dashboard/subscriptions`.

## Purpose

The dashboard subscription surface lets users:

- review their user-scope subscription
- review organization subscriptions they belong to
- filter by team where relevant
- manage owner-capable organization subscriptions
- review payment or invoice-style history

## Route And Actions

Main route:

- `app/(dashboard)/dashboard/subscriptions/page.tsx`

Main actions:

- `manageOrganizationSubscriptionAction`
- `cancelUserSubscriptionAction`

Main file:

- `app/(dashboard)/dashboard/subscriptions/actions.ts`

## Supporting UI Pieces

Current dashboard subscription UI also uses:

- `payments-data-table.tsx`
- `invoices-data-table.tsx`
- `forms.ts`
- `validation.ts`
- `validation-messages.ts`

This is not just one page. It is a small feature surface.

## Data Sources

Main payload loader:

- `getCurrentUserSubscriptionManagementData()` in `lib/db/queries.ts`

Related limit source:

- `lib/organizations/subscription-limits.ts`

## Scope Model

Current scope split:

- user subscription
  scope `user`
- team or organization subscription
  scope `organization`

Order targeting relies on explicit order target columns such as:

- `payment_orders.target_type`
- `payment_orders.target_team_id`
- `payment_orders.target_user_id`

## User Organization Limit

The dashboard view now treats the active user subscription template as the
authoritative source for the organization limit:

- `dashboard.user.organizations.max`

Count-quota semantics for the current core keys:

- `-1` = unlimited
- `1..N` = finite limit
- `0` is invalid for `dashboard.user.organizations.max` and
  `dashboard.team.members.max`
- `dashboard.team.invites.enabled` is the official invite gate

## Practical Review Questions

When changing dashboard subscription behavior, verify:

1. which scope the screen is showing
2. whether the user is owner-capable for the team flow
3. whether the relevant limit is being read from the correct template scope
4. whether order target metadata still resolves correctly

## Tests Worth Knowing

High-signal related test:

- `tests/payments/order-subscription-lifecycle.test.ts`

You should also validate the dashboard page behavior after lifecycle changes,
because good lifecycle code can still leave the dashboard view inconsistent.

## Common Mistakes

- documenting only plan features and ignoring the dashboard management surface
- forgetting the user-vs-organization scope split
- changing lifecycle behavior without checking the dashboard datatable outputs

## Related Docs

- `./payment-lifecycle.md`
- `../subscriptions-and-features.md`
- `../reference/platform-capabilities.md`
