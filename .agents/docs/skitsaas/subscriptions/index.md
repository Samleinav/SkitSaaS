---
title: "Subscriptions"
sidebar_position: 0
---

# Subscriptions

This section is the Botble-style subscriptions layer for SkitSaaS. It exists so
subscription features, payment lifecycle, dashboard management, and checkout
change rules can be explored in one place.

## What This Section Covers

Use this section when the task is:

- understanding host-managed plan features and quotas
- tracing how checkout/webhooks/admin orders affect subscription state
- working on `/dashboard/subscriptions`
- changing checkout behavior for upgrades, downgrades, or other subscription
  transitions

## Read Order

1. [Subscriptions And Features](../subscriptions-and-features.md)
2. [Payment Lifecycle](./payment-lifecycle.md)
3. [Dashboard Management](./dashboard-management.md)
4. [Checkout Change Checklist](./checkout-change-checklist.md)

## Related Main Docs

- `../checkout-side-effects-playbook.md`
- `../events-and-hooks.md`
- `../notifications-and-delivery.md`
- `../reference/platform-capabilities.md`

## Practical Rule

Separate these concerns before touching billing code:

- plan configuration
- quota reads and enforcement
- payment/order recording
- subscription lifecycle projection
- dashboard-facing management UI
