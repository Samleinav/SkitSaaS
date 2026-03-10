---
title: Module Notifications
sidebar_position: 8
description: Send and receive persisted notifications from module code using @skitsaas/sdk and @skitsaas/sdk/server.
---

# Module Notifications

Modules can send persisted notifications to users, teams, or all platform users, and read/acknowledge them client-side — all through the SDK without importing host utilities.

## SDK Contracts

### Client (`@skitsaas/sdk`)

```ts
import { useNotifications, resolveSdkNotificationAreaFromPath } from '@skitsaas/sdk';

const { items, unreadItems, refresh, markRead, dismiss } = useNotifications({ area: 'dashboard' });
```

`useNotifications` polls `/api/notifications` for the current private area.

Options:
- `area`: `'admin' | 'dashboard' | 'both'` — which notification feed to read
- `includeRead`: `boolean` — include already-read items (default `false`)

### Server (`@skitsaas/sdk/server`)

```ts
import {
  createNotification,
  notifyGlobal,
  notifyUser,
  notifyUsers,
  notifyTeam,
  notifyTeamMembers,
  notifyTeamOwner
} from '@skitsaas/sdk/server';
```

## Sending Notifications

### To a specific user

```ts
await notifyUser(userId, {
  title: 'Order confirmed',
  body: 'Your order #1234 has been confirmed.',
  area: 'dashboard'
});
```

### To all team members

```ts
await notifyTeam(teamId, {
  title: 'New report ready',
  body: 'The monthly report is available.',
  area: 'dashboard'
});
```

### To all users globally

```ts
await notifyGlobal({
  title: 'Scheduled maintenance',
  body: 'System maintenance on Saturday 02:00 UTC.',
  area: 'both'
});
```

## Audience and Area

`createNotification` accepts:

```ts
await createNotification({
  audience: { type: 'users', userIds: [1, 2, 3] },
  title: 'Hello',
  body: 'You have a new message.',
  area: 'auto'
});
```

| Audience type | Target |
|---------------|--------|
| `global` | All users |
| `users` | Explicit user ID list |
| `team` | Team members resolved by host |

| Area | Visible in |
|------|-----------|
| `auto` | admin for admin-role users; dashboard for others |
| `admin` | Admin area only |
| `dashboard` | Dashboard area only |
| `both` | Both areas |

## Sending from an Event Handler

```ts
// modules/mod.<id>/src/manifest.ts
import { defineModule } from '@skitsaas/sdk';
import { notifyTeam } from '@skitsaas/sdk/server';

export default defineModule({
  moduleId: 'mod.<id>',
  version: '0.1.0',
  displayName: 'My Module',
  eventHandlers: [
    {
      id: 'mod.<id>.notifyOnCheckout',
      hook: 'checkout.after_create_order',
      priority: 10,
      run: async (payload, context) => {
        await notifyTeam(payload.teamId, {
          title: 'New order',
          body: `Order #${payload.orderId} created.`,
          area: 'dashboard'
        });
      }
    }
  ]
});
```

## Boundary Rules

```
FORBIDDEN:
  useNotifications from @/... (host path)
  @/lib/notifications/*
  @/components/ui/notification*

REQUIRED (client):
  useNotifications, resolveSdkNotificationAreaFromPath → @skitsaas/sdk

REQUIRED (server/event handler):
  createNotification, notifyGlobal, notifyUser, notifyUsers,
  notifyTeam, notifyTeamMembers, notifyTeamOwner → @skitsaas/sdk/server

FORBIDDEN (module code):
  configureNotifications  — this is host-only bootstrap (lib/modules/sdk-server-bootstrap.ts)
```

## Theme Integration

Theme templates can surface the notification feed via `ui.user-menu`. See `docs/themes/02-theme-authoring-guide.md` and `theme-ctc-authoring` skill.

## Related SDK Changelog

- `2026-03-10 - sdk-persisted-notifications` in `docs/reference/05-sdk-changelog.md`
