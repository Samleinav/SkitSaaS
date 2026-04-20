---
title: "Admin Dashboard Runtime"
sidebar_position: 0
---

# Admin Dashboard Runtime

Use this page when the task is about the `/admin` home screen, its widget
layout, visibility rules, or how modules can inject dashboard widgets into the
backoffice landing page.

## What This Surface Is

`/admin` is a core backoffice dashboard, not a module dispatcher page.

It combines:

- core summary widgets
- recent governance activity
- optional module-provided admin dashboard widgets
- theme-aware template wrapping for the admin home surface

That means it sits at the intersection of:

- admin data queries
- module runtime
- theme/CTC rendering
- operations visibility

## Main Files

- `app/(dashboard)/admin/page.tsx`
- `app/(dashboard)/admin/admin-dashboard/modules.tsx`
- `app/(dashboard)/admin/admin-dashboard/config.ts`
- `app/(dashboard)/admin/admin-dashboard/types.ts`

Important supporting files:

- `lib/db/queries.admin.ts`
- `lib/modules/runtime.ts`
- `lib/themes/code-registry.generated.ts`

## Core Dashboard Modules

The current core module registry in `admin-dashboard/modules.tsx` ships three
host-owned sections:

- `overview`
- `quickLinks`
- `recentActivity`

Those map to theme template IDs on the admin page:

- `section.admin.dashboard.overview`
- `section.admin.dashboard.quick-links`
- `section.admin.dashboard.recent-activity`

If a theme does not provide one of those templates, the page falls back to the
plain React component from the core module registry.

## Data Model For The Page

The admin home page loads:

- summary metrics from `getAdminDashboardSummary()`
- recent log rows from `getSystemActivityLogsForAdmin(...)`

`getAdminDashboardSummary()` should be treated as a current-state aggregate
across open subscription assignments, regardless of whether they target
organizations or users.

The recent activity widget is intentionally a short governance summary. It is
not the replacement for the full review surface under `/admin/logs`, and it
should only request the small visible slice shown on the admin home screen.

## Visibility Controls

Core dashboard section visibility is controlled by two layers:

1. code defaults in `ADMIN_DASHBOARD_MODULE_VISIBILITY`
2. optional env override in `ADMIN_DASHBOARD_ENABLED_MODULES`

Example:

```bash
ADMIN_DASHBOARD_ENABLED_MODULES=overview,quickLinks,recentActivity
```

If the env value is set, it overrides the code defaults for the core sections.

## Module Widget Injection

Module-owned widgets are a separate runtime path from the core dashboard
sections.

Modules can contribute:

- `adminDashboardWidgets`

in their manifest, for example:

```ts
adminDashboardWidgets: [
  {
    id: 'mod.example.suite.widget.admin',
    Component: ExampleSuiteAdminWidget,
    order: 70
  }
]
```

Runtime helpers in `lib/modules/runtime.ts` resolve only enabled-module widgets:

- `buildEnabledModuleWidgets(...)`
- `getEnabledAdminDashboardModuleWidgets()`

Widgets are ordered numerically by `order`, then by `id`.

Canonical examples:

- `modules/mod.example.suite/README.md`
- `modules/mod.example.package/README.md`

## Theme Integration

The admin page wraps the whole dashboard in `ThemeCodeTemplate` when an admin
theme is active.

Important template IDs:

- `page.admin.home`
- `section.admin.dashboard.overview`
- `section.admin.dashboard.quick-links`
- `section.admin.dashboard.recent-activity`
- `section.admin.dashboard.module-widget` as the generic fallback for
  module-provided widgets

This is why `/admin` is not just "a page with cards". It is part of the CTC and
theme runtime.

## Practical Change Rules

If the task is about:

- changing KPI content:
  start in `app/(dashboard)/admin/page.tsx` and `queries.admin.ts`
- changing core dashboard sections:
  start in `admin-dashboard/modules.tsx`
- changing which sections show:
  check `admin-dashboard/config.ts` and env overrides
- adding module widgets:
  update the module manifest and then validate runtime enablement
- changing the final rendered shell:
  check admin theme template IDs before touching only the React fallback

## Common Mistakes

- treating admin dashboard widgets as the same thing as dispatcher-based module
  pages
- assuming `/admin` is only theme-styled CSS instead of template-aware
  rendering
- using recent activity as a full audit console instead of routing deeper work
  to `/admin/logs`

## Related Docs

- `./system-activity-and-audit-logs.md`
- `../theme-development/template-precedence-and-locking.md`
- `../modules-development/navigation-widgets-and-notifications.md`
