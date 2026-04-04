---
title: "Navigation, Widgets, And Notifications"
sidebar_position: 0
---

# Navigation, Widgets, And Notifications

Use this page when a module needs to appear in admin/dashboard navigation,
inject dashboard widgets, or trigger persisted notifications as part of its
runtime behavior.

## Navigation Fields In The Manifest

Modules can declare:

- `adminNavItems`
- `dashboardNavItems`
- `frontendNavItems`

Each nav item includes:

```ts
{
  id: 'mod.analytics.nav',
  href: '/admin/custom/analytics',
  label: 'Analytics',
  order: 50,
  exact: false
}
```

Important rules:

- `href` should stay in the correct area
- friendly URLs should be backed by route aliases when needed
- ordering is numeric first, then label-based tie-break
- only enabled modules contribute runtime nav items

Runtime helpers in `lib/modules/runtime.ts`:

- `buildEnabledModuleNavItems(...)`
- `getEnabledModuleNavItems(area)`

Canonical examples:

- `modules/mod.example.suite/src/manifest.ts`
- `modules/mod.example.package/src/manifest.js`

## Alias Relationship

If the module uses friendly admin or dashboard URLs, pair nav items with:

- `adminRouteAliases`
- `dashboardRouteAliases`
- `frontendRouteAliases`

Do not document the alias as if it replaces the canonical dispatcher route. It
is the pleasant URL, not the whole contract.

## Dashboard Widgets

Modules can inject dashboard cards or panels through:

- `adminDashboardWidgets`
- `dashboardWidgets`

Example:

```ts
adminDashboardWidgets: [
  {
    id: 'mod.example.suite.widget.admin',
    Component: ExampleSuiteAdminWidget,
    order: 70
  }
]
```

Runtime helpers:

- `buildEnabledModuleWidgets(...)`
- `getEnabledAdminDashboardModuleWidgets()`
- `getEnabledDashboardModuleWidgets()`

Ordering is by `order`, then `id`.

## Where Widgets Actually Show

There are two different dashboard stories:

- host-owned `/admin` core dashboard sections
- module-contributed widget injection

Those are related, but not identical.

For admin specifically, also understand:

- `app/(dashboard)/admin/page.tsx`
- `app/(dashboard)/admin/admin-dashboard/modules.tsx`

before changing widget composition behavior.

## Notifications From Modules

Module code should not import host notification services directly.

Preferred server helpers:

- `createNotification()`
- `notifyGlobal()`
- `notifyUser()`
- `notifyUsers()`
- `notifyTeam()`
- `notifyTeamMembers()`
- `notifyTeamOwner()`

Those come from:

- `@skitsaas/sdk/server`

The host wiring lives in:

- `lib/modules/sdk-server-bootstrap.ts`

## Copyable Composite Manifest Slice

When a module prompt asks for navigation, widget injection, and persisted
notifications together, this is the shortest practical shape:

```ts
import { defineModule, EVENT_HOOKS } from '@skitsaas/sdk';
import { notifyTeam } from '@skitsaas/sdk/server';
import { AnalyticsSuiteRoutes } from './routes';
import { AnalyticsAdminWidget, AnalyticsDashboardWidget } from './widgets';

export default defineModule({
  moduleId: 'mod.analytics-suite',
  version: '0.1.0',
  adminRouteAliases: [String(AnalyticsSuiteRoutes.admin.home)],
  dashboardRouteAliases: [String(AnalyticsSuiteRoutes.dashboard.home)],
  adminNavItems: [
    {
      id: 'mod.analytics-suite.admin.nav',
      href: String(AnalyticsSuiteRoutes.admin.home),
      label: 'Analytics Suite',
      order: 80
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.analytics-suite.dashboard.nav',
      href: String(AnalyticsSuiteRoutes.dashboard.home),
      label: 'Analytics Suite',
      order: 80
    }
  ],
  adminDashboardWidgets: [
    {
      id: 'mod.analytics-suite.widget.admin',
      Component: AnalyticsAdminWidget,
      order: 70
    }
  ],
  dashboardWidgets: [
    {
      id: 'mod.analytics-suite.widget.dashboard',
      Component: AnalyticsDashboardWidget,
      order: 70
    }
  ],
  eventHandlers: [
    {
      id: 'mod.analytics-suite.notify-after-order',
      hook: EVENT_HOOKS.checkoutAfterCreateOrder,
      priority: 10,
      run: async (payload) => {
        if (!payload.teamId) {
          return;
        }

        await notifyTeam(payload.teamId, {
          title: 'Analytics order created',
          body: `Order #${payload.orderId} is ready for review.`,
          area: 'dashboard'
        });
      }
    }
  ]
});
```

Use this as the all-in-one starter when the module should:

- expose a friendly alias in admin or dashboard navigation
- inject one or more runtime widgets
- react to a platform event with a persisted notification

The main action or checkout flow should still emit the relevant event. The
manifest is where the module declares the reusable secondary behavior.

## Recommended Notification Pattern

If the notification is cross-cutting, prefer:

1. emit a hook from the main action
2. handle secondary behavior in an event handler
3. send the persisted notification through SDK helpers

That keeps modules decoupled from the exact host mutation path.

## Example Mental Model

```txt
module action
  -> emitEventAsync('mod.<moduleId>.something.happened', payload, context)
  -> module or core handler runs
  -> notifyTeam(...) / notifyUser(...)
  -> inbox + toast runtime surface the message
```

## Practical Checklist

Before treating the module runtime as complete, verify:

1. nav items only reference real dispatcher routes or real aliases
2. widget IDs are stable and ordered intentionally
3. the module is enabled in runtime, not only registered in source
4. persisted notifications use SDK helpers, not host imports
5. the module README documents its nav, widget, and notification behavior

## Common Mistakes

- adding a nav item for an alias that was never registered
- assuming registered widgets render even when the module is disabled
- creating persisted notifications through host-only imports in portable module
  code
- mixing dashboard widgets with dispatcher pages in docs and mental models

## Related Docs

- `./pages-routing-and-api.md`
- `./ops-runbook.md`
- `../operations/admin-dashboard.md`
- `../notifications-and-delivery.md`
