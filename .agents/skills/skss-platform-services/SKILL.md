---
name: skss-platform-services
description: Use for hooks, events, notifications, plan features, quotas, and other cross-cutting runtime services that modules and core code can consume in SkitSaaS.
---

# skss-platform-services

## Read Order

1. `../../docs/skitsaas/hooks/index.md`
2. `../../docs/skitsaas/events-and-hooks.md`
3. `../../docs/skitsaas/hooks/emitters-checklist.md`
4. `../../docs/skitsaas/notifications-and-delivery.md`
5. `../../docs/skitsaas/subscriptions/index.md` when the task is about subscription lifecycle or dashboard subscription UX
6. `../../docs/skitsaas/checkout-side-effects-playbook.md` when the task is triggered by checkout, payments, or follow-up side effects
7. `../../docs/skitsaas/subscriptions-and-features.md`
8. `../../docs/skitsaas/operations/index.md` when the task is operational, audit-related, or delivery-related
9. `../../docs/skitsaas/modules-and-sdk-boundaries.md`

## Verify In Code Only If Needed

- `lib/events/*`
- `lib/features/*`
- `lib/quota/*`
- `lib/modules/sdk-server-bootstrap.ts`
- `app/sdk/src/server.ts`

## Rules

- use the event bus before inventing ad-hoc cross-module callbacks
- use SDK feature and quota helpers in module code
- keep host-only feature catalog usage inside host code unless a public SDK surface exists
- remember queued events can fall back to inline execution
- prefer event-handler-driven notification flows for cross-cutting behavior such
  as checkout side effects

## Watch For

- direct billing-table joins inside module code
- custom hook names that ignore existing catalog conventions
- assuming async emit always means Redis-backed queueing
