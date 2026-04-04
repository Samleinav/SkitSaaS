---
title: "Notifications And Delivery"
sidebar_position: 0
---

# Notifications And Delivery

Use this page when the task involves persisted notifications, notification inbox
behavior, or the question "where should a module create notifications after an
event like checkout?"

## Two Notification Systems

SkitSaaS has two different notification paths.

### Client-only transient notifications

Use when there is no backend persistence:

- `components/ui/notify.tsx`
- `useNotify()`

Typical use case:

- block a click
- show a warning
- display short local success/error feedback

### Persisted system notifications

Use when the notification should be stored, fetched later, shown in the inbox,
or replayed as toast runtime:

- `lib/notifications/service.ts`
- `GET /api/notifications`
- `POST /api/notifications/read`
- `POST /api/notifications/dismiss`
- SDK notification helpers

This page is about the persisted path.

## Canonical Server APIs

Server-side notification creation lives in:

- `lib/notifications/service.ts`

Key concepts there:

- audience
- tone
- visibility area
- runtime area resolution by role
- read/dismiss state per recipient

Relevant area types:

- `auto`
- `admin`
- `dashboard`
- `both`

Important rule:

- `auto` resolves to `admin` for admin-like roles and `dashboard` for others

## SDK Surface

### Client

Use the persisted notification feed through the SDK client path:

- `useNotifications()`
- `resolveSdkNotificationAreaFromPath(...)`

### Server

Use the SDK server helpers instead of host-only imports in module code:

- `createNotification()`
- `notifyGlobal()`
- `notifyUser()`
- `notifyUsers()`
- `notifyTeam()`
- `notifyTeamMembers()`
- `notifyTeamOwner()`

## Host Runtime Wiring

The host wires module SDK notification helpers in:

- `lib/modules/sdk-server-bootstrap.ts`

That means module code should use the SDK helper, while the host keeps the real
notification service ownership.

## API Endpoints

The persisted feed is exposed through:

- `app/api/notifications/route.ts`
- `app/api/notifications/read/route.ts`
- `app/api/notifications/dismiss/route.ts`

Those routes:

- read notifications for the current user
- mark them as read
- dismiss them

## Runtime Toast Bridge

Unread persisted notifications are also bridged into the toast runtime through:

- `components/ui/notification-runtime.tsx`

That component:

- resolves the current notification area from the pathname
- pulls unread items via `useNotifications()`
- shows toast UI through `useNotify()`
- marks shown notifications as read

This is why persisted notifications can feel both inbox-based and toast-driven.

## Audience Model

The notification audience can target:

- all users
- one user
- many users
- a team

The service resolves recipient user ids before writing recipient rows.

## Recommended Pattern For Checkout-Related Work

If the notification is tightly bound to the mutation and purely local to that
action, creating it in the action can be acceptable.

If the notification is cross-cutting or should remain decoupled from the main
business action, prefer this flow:

1. the checkout or payment flow emits an event
2. an event handler performs secondary behavior
3. the handler sends the persisted notification

That keeps the mutation path smaller and makes secondary behavior easier to
reuse, disable, or reorder.

## Recommended Pattern For Modules

For module code:

1. emit a hook or respond to an existing hook
2. evaluate any plan/quota requirement through SDK helpers
3. create the persisted notification through SDK server helpers

Avoid host-only notification imports in module code.

## Concrete Example Flow

Example mental model:

```txt
checkout action
  -> emitEventAsync('checkout.after_create_order', payload, context)
  -> module or core event handler receives payload
  -> handler checks plan/quota rule if needed
  -> handler calls notifyTeam(...) or notifyUser(...)
  -> notification feed exposes item through /api/notifications
  -> NotificationRuntime shows toast and marks it read
```

### Copyable Event Handler Example

```ts
import { defineModule, EVENT_HOOKS } from '@skitsaas/sdk';
import { notifyTeam } from '@skitsaas/sdk/server';

export default defineModule({
  moduleId: 'mod.billing-reports',
  version: '0.1.0',
  displayName: 'Billing Reports',
  eventHandlers: [
    {
      id: 'mod.billing-reports.notify-after-checkout',
      hook: EVENT_HOOKS.checkoutAfterCreateOrder,
      priority: 10,
      run: async (payload) => {
        if (!payload.teamId) {
          return;
        }

        await notifyTeam(payload.teamId, {
          title: 'New order created',
          body: `Order #${payload.orderId} was created successfully.`,
          area: 'dashboard'
        });
      }
    }
  ]
});
```

This is the shortest practical pattern for "checkout event in, persisted
notification out" without host-only imports.

## Area Visibility Rules

Use:

- `admin` for admin-only operational messages
- `dashboard` for end-user or team-facing messages
- `both` when either area should surface the same message
- `auto` when the same logical notification should resolve by role

## Common Mistakes

- using transient toast notifications when the requirement is persisted inbox behavior
- importing host notification service directly in module code
- putting every notification directly inside the checkout action when an event
  handler would make the flow cleaner
- not thinking through `auto` versus explicit area visibility

## Related Docs

- `events-and-hooks.md`
- `subscriptions-and-features.md`
- `modules-and-sdk-boundaries.md`
