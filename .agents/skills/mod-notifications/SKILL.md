---
name: mod-notifications
description: Send persisted notifications and read the notification feed from module code. Use this skill when a module needs to notify users, teams, or all platform users, or when displaying a notification feed in a module UI component.
---

# mod-notifications

## Scope

Module-side notification authoring using `@skitsaas/sdk` (client) and `@skitsaas/sdk/server` only. Theme-side notification UI → `theme-ctc-authoring`.

## Required Reference

- `docs/modules/08-notifications.md` — full contract, audience types, area targeting, event handler patterns, boundary rules

## Boundary Rules

```
FORBIDDEN:
  @/lib/notifications/*
  useNotifications from @/... (host path)
  @/components/ui/notification*
  configureNotifications  (host-only bootstrap — lib/modules/sdk-server-bootstrap.ts)

REQUIRED (client):
  useNotifications, resolveSdkNotificationAreaFromPath → @skitsaas/sdk

REQUIRED (server / event handler):
  createNotification, notifyGlobal, notifyUser, notifyUsers,
  notifyTeam, notifyTeamMembers, notifyTeamOwner → @skitsaas/sdk/server
```

## Quick Reference

### Send from a server action / API handler

```ts
import { notifyUser, notifyTeam } from '@skitsaas/sdk/server';

await notifyUser(userId, { title: 'Done', body: 'Task completed.', area: 'dashboard' });
await notifyTeam(teamId, { title: 'New report', body: 'Ready to download.', area: 'both' });
```

### Send from an event handler

```ts
eventHandlers: [{
  id: 'mod.<id>.notifyOnEvent',
  hook: 'checkout.after_create_order',
  priority: 10,
  run: async (payload, context) => {
    await notifyTeam(payload.teamId, {
      title: 'Order created',
      body: `Order #${payload.orderId}`,
      area: 'dashboard'
    });
  }
}]
```

### Read in a client component

```tsx
'use client'
import { useNotifications } from '@skitsaas/sdk';

export function NotificationCount({ area }) {
  const { unreadItems } = useNotifications({ area });
  return <span>{unreadItems.length}</span>;
}
```

## Audience Types

| Helper | Audience | Resolves |
|--------|----------|---------|
| `notifyGlobal` | All platform users | global |
| `notifyUser(userId, ...)` | One user | users |
| `notifyUsers(userIds, ...)` | Explicit list | users |
| `notifyTeam(teamId, ...)` | All team members | team |
| `notifyTeamMembers(teamId, ...)` | Members (no owner) | team |
| `notifyTeamOwner(teamId, ...)` | Team owner only | team |

## Area Targeting

| Value | Visible in |
|-------|-----------|
| `auto` | admin area for admin-role users; dashboard for others |
| `admin` | Admin only |
| `dashboard` | Dashboard only |
| `both` | Both areas |

## Verification

```bash
rg -n "@/lib/notifications|configureNotifications" modules/<moduleId>
# must return 0 matches
pnpm exec tsc --noEmit
```
