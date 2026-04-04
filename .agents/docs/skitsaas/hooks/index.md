---
title: "Hooks"
sidebar_position: 0
---

# Hooks

This section is the Botble-style navigation layer for SkitSaaS hooks. It
exists so event bus behavior, emitter locations, queue semantics, and
follow-up-side-effect design can be explored together.

## What This Section Covers

Use this section when the task is:

- deciding whether behavior belongs in an action or an event handler
- finding where a hook is emitted today
- tracing checkout, subscription, or notification side effects
- checking whether a hook already exists before inventing a new one

## Read Order

1. [Events And Hooks](../events-and-hooks.md)
2. [Emitters Checklist](./emitters-checklist.md)
3. [Notifications And Delivery](../notifications-and-delivery.md)
4. [Checkout Side Effects Playbook](../checkout-side-effects-playbook.md)

## Practical Rule

If the question is "where should this cross-cutting behavior live?" or "who
already emits this hook?", start here before adding another callback path.

## Related Docs

- `../operations/system-activity-and-audit-logs.md`
- `../subscriptions/payment-lifecycle.md`
- `../modules-development/navigation-widgets-and-notifications.md`
