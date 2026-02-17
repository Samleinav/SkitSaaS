---
title: Navigation and Widgets
sidebar_position: 6
---

# Navigation and Widgets

## Navigation

Nav items are declared in the manifest:

- `adminNavItems`
- `dashboardNavItems`

Each entry:

```ts
{
  id: 'mod.analytics.nav',
  href: '/admin/custom/analytics',
  label: 'Analytics',
  order: 50,
  exact?: boolean
}
```

Notes:

- Admin nav renders module items with a default `Package` icon.
- Order is numeric; ties are sorted by label.
- If `href` is a custom module URL, register it in `adminRouteAliases` / `dashboardRouteAliases`.
- Aliases are validated against core routes and cannot overlap with aliases from other modules.
- For `create/edit/details` views, prefer one base alias and route internally using `slug`.

## Widgets

Widgets can be injected into dashboards via:

- `adminDashboardWidgets`
- `dashboardWidgets`

Example:

```ts
adminDashboardWidgets: [
  {
    id: 'mod.analytics.widget',
    Component: AnalyticsWidget,
    order: 20
  }
]
```

Rendering:

- Admin widgets are read via `getEnabledAdminDashboardModuleWidgets()` in runtime.
- Dashboard widgets are read via `getEnabledDashboardModuleWidgets()` in runtime.
