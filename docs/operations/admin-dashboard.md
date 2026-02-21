---
title: Admin Dashboard Modules
sidebar_position: 1
description: Core admin dashboard widget architecture and operational visibility controls.
---

# Admin Dashboard Modules

The `/admin` route is now a modular dashboard.

## Module architecture

- Page entrypoint: `app/(dashboard)/admin/page.tsx`
- Module registry: `app/(dashboard)/admin/admin-dashboard/modules.tsx`
- Visibility config: `app/(dashboard)/admin/admin-dashboard/config.ts`
- Shared module types: `app/(dashboard)/admin/admin-dashboard/types.ts`

Note: these **dashboard widgets** are separate from the **module runtime** described in
`docs/modules/*`, which controls dispatcher routes and nav items.

To add a new admin dashboard widget:

1. Create a module component in `modules.tsx` (or import one there).
2. Register it in `ADMIN_DASHBOARD_MODULE_REGISTRY`.
3. Add its default visibility flag in `ADMIN_DASHBOARD_MODULE_VISIBILITY`.

## Current default modules

- `overview`: compact KPI counters + **date-range** line chart (`users`, `subscriptions`, `sales`).
- `quickLinks`: shortcut cards to core admin routes.
- `recentActivity`: compact latest system events with CTA to `/admin/logs`.

## Choose which modules are shown

Two options:

1. **Code config (default)**  
   Toggle booleans in `ADMIN_DASHBOARD_MODULE_VISIBILITY`.

2. **Environment override (optional)**  
   Set `ADMIN_DASHBOARD_ENABLED_MODULES` as a comma-separated list:

   ```bash
   ADMIN_DASHBOARD_ENABLED_MODULES=overview,quickLinks,recentActivity
   ```

If `ADMIN_DASHBOARD_ENABLED_MODULES` is set, it overrides default visibility flags.

## Canary evidence (Ops)

For periodic production/staging evidence packs and artifacts, see:

- `docs/operations/ops-canary-pack.md`


