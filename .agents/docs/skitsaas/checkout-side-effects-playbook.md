---
title: "Checkout Side Effects Playbook"
sidebar_position: 0
---

# Checkout Side Effects Playbook

Use this page when the task is about what should happen after a checkout-related
action and the question is not just "what event hooks exist?" but "where should
I put the follow-up behavior?"

This page is the orchestration guide for:

- checkout hooks
- subscription lifecycle side effects
- plan or quota checks
- persisted notifications

## The Mental Model

Treat checkout as the primary business flow and everything else as side effects
that may belong in different layers.

The safe default is:

1. checkout or payment pipeline persists the main order/payment state
2. the runtime emits checkout-related hooks
3. specialized side effects run in event handlers or follow-up services
4. notification and quota logic stays explicit and observable

## Canonical Runtime Points

Current high-signal files:

- checkout event recording:
  `lib/payments/checkout-system.ts`
- subscription lifecycle projection:
  `lib/payments/order-subscription-events.ts`
- event bus:
  `lib/events/bus.ts`
- hook catalog:
  `app/sdk/src/events/catalog.ts`
- persisted notification service:
  `lib/notifications/service.ts`
- module SDK bootstrap:
  `lib/modules/sdk-server-bootstrap.ts`

## Hooks Worth Knowing First

The most relevant current hooks for checkout side effects are:

- `EVENT_HOOKS.checkoutAfterCreateOrder`
- `EVENT_HOOKS.paymentOrderStatusChanged`
- `EVENT_HOOKS.paymentOrderLifecycleApplied`

Current runtime behavior already emits checkout and lifecycle events from the
payments pipeline, so you usually do not need to invent a new cross-cutting
callback mechanism.

## Direct Action Vs Event Handler

Use this decision rule.

### Keep it in the action when:

- the behavior is tightly coupled to the mutation
- the action result should fail if the side effect fails
- the behavior is not meant to be reused by other flows

### Prefer an event handler when:

- the behavior is cross-cutting
- the side effect should be reusable from webhooks, admin actions, or multiple
  checkout paths
- the behavior is operational or user-facing but not part of the minimal write
  needed for the checkout itself
- you want the side effect to be easier to observe, disable, or reorder

For most "after checkout, notify someone, maybe enforce a plan/quota branch"
use cases, the event-handler path is the cleaner default.

## Recommended Orchestration

For a module or cross-cutting feature, the recommended shape is:

```txt
checkout flow
  -> checkout/order state is persisted
  -> checkout hook is emitted
  -> event handler runs
  -> plan/quota rule is checked
  -> persisted notification is created
```

This keeps the checkout flow focused on payment/order correctness while the
secondary behavior stays explicit and testable.

## Where Quota Or Feature Checks Belong

Use the feature/quota decision in the server path, not only in the UI.

For host code:

- use the host feature controller where appropriate

For module code:

- use SDK feature and quota helpers

Do not:

- read plan state only on the client
- join billing tables directly inside portable module code

## Where Notification Creation Belongs

If the notification is a cross-cutting side effect of checkout:

- prefer the event handler path

If the notification is inseparable from the immediate action result:

- creating it directly in the action can still be acceptable

The important thing is to decide intentionally rather than mixing notification
creation into every payment handler by habit.

## Recommended Audience And Area Thinking

Ask these two questions explicitly.

### Who should receive it?

- one user
- a team
- team members
- team owner
- all users

### Where should it appear?

- `admin`
- `dashboard`
- `both`
- `auto`

Use `auto` when role-based resolution is the desired behavior.
Use explicit areas when the operational destination must not depend on role.

## Example Flow

This is the preferred mental model for a module reacting to successful checkout:

1. checkout pipeline writes the order
2. the system emits `checkout.after_create_order`
3. your module handler receives the payload
4. the handler checks the relevant plan/quota rule
5. if the condition passes, it calls `notifyTeam(...)` or `notifyUser(...)`
6. the notification appears in `/api/notifications`
7. `NotificationRuntime` can surface it as toast and mark it read

## Why Not Put Everything In Checkout?

Because checkout has to deal with:

- provider state
- retries
- webhook replay
- order status projection
- subscription lifecycle

If every operational side effect is inlined there, the flow becomes harder to
reason about and harder to reuse. Event-driven side effects keep the core
pipeline smaller.

## Testing Strategy

When adding this kind of feature, test at these layers:

1. does the checkout or order flow emit the expected hook?
2. does the side-effect handler run with the expected payload?
3. does the plan/quota gate behave correctly?
4. is the notification written to the persisted feed with the right audience and
   area?
5. does the admin/dashboard runtime display it in the intended place?

## Common Mistakes

- creating notifications directly in every provider callback without a clear reason
- putting quota logic only in the frontend
- using transient `useNotify()` where persisted inbox behavior is required
- adding a brand-new custom callback chain instead of reusing the event bus

## Related Docs

- `events-and-hooks.md`
- `notifications-and-delivery.md`
- `subscriptions-and-features.md`
