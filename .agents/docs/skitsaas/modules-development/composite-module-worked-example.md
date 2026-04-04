---
title: "Composite Module Worked Example"
sidebar_position: 0
---

# Composite Module Worked Example

Use this page when the prompt is not just "create a module" but "create one
module that owns admin and dashboard pages, a typed API, nav items, widgets,
notifications, and plan-aware behavior."

This example intentionally overlaps with the `source-host` and
`source-package` starters. The difference is scope: this page shows one feature
slice that touches multiple runtime surfaces at once.

## Assumption

This worked example assumes `source-host` so it can demonstrate more surfaces
in one place with less build noise.

If the target must be portable:

- keep the same file ownership
- replace any host-only gap with SDK-only usage
- cross-check `source-package-worked-example.md`

## Scenario

Assume we are building `mod.analytics-suite` with these requirements:

- admin page with a table and create form
- dashboard page with a lighter create flow
- typed module API for exports
- admin and dashboard aliases
- admin and dashboard widgets
- checkout-related event handler that sends a persisted notification
- plan/quota gate around export behavior
- optional module template pack for `ui.table` and `ui.async-submit-button`

## Surface Map

Use this ownership model:

- `module.json`
  runtime mode, source entry, routes entry, DB metadata
- `src/routes.ts`
  route metadata only: aliases and typed API route contracts
- `src/manifest.ts`
  module runtime wiring: pages, `apiRoutes`, nav items, widgets, handlers
- `src/forms.ts`
  BuildForm contracts
- `src/tables.ts`
  BuildTable contracts
- `src/actions.ts`
  server mutations, server auth, revalidation
- `src/data.ts`
  module DB reads and writes
- `src/widgets.tsx`
  admin/dashboard widget components
- `src/templates/*`
  optional module CTC defaults and overrides

## Recommended Tree

```txt
modules/mod.analytics-suite/
  README.md
  module.json
  db/
    schema.ts
    migrations/
      0001_init.sql
  i18n/
    translations/
      en.json
  src/
    constants.ts
    routes.ts
    manifest.ts
    forms.ts
    tables.ts
    actions.ts
    data.ts
    widgets.tsx
    pages/
      admin-pages.tsx
      dashboard-pages.tsx
    templates/
      defaults.json
      overrides.json
```

## `module.json`

This is the clean default when the module needs aliases and typed API route
metadata:

```json
{
  "moduleId": "mod.analytics-suite",
  "moduleMode": "source-host",
  "version": "0.1.0",
  "sourceEntry": "src/manifest.ts",
  "routesEntry": "src/routes.ts",
  "sdkRange": "^1.9.0",
  "db": {
    "schemaVersion": 1,
    "migrationsDir": "db/migrations"
  }
}
```

`routesEntry` matters here because aliases and typed API proxy metadata should
participate in generated runtime wiring.

## `src/routes.ts`

Keep this file edge-safe and metadata-only:

```ts
import { RouteAdmin, RouteApi, RouteDashboard } from '@skitsaas/sdk';

const ADMIN_BASE = '/custom/analytics-suite';
const DASHBOARD_BASE = '/custom/analytics-suite';
const API_BASE = '/modules/mod.analytics-suite';

export const AnalyticsSuiteRoutes = {
  admin: {
    home: RouteAdmin(`${ADMIN_BASE}`).name('analytics-suite.admin.home'),
    create: RouteAdmin(`${ADMIN_BASE}/create`).name('analytics-suite.admin.create')
  },
  dashboard: {
    home: RouteDashboard(`${DASHBOARD_BASE}`).name('analytics-suite.dashboard.home'),
    create: RouteDashboard(`${DASHBOARD_BASE}/create`).name('analytics-suite.dashboard.create')
  },
  api: {
    exportCsv: RouteApi(`${API_BASE}/exports`)
      .POST()
      .auth('admin')
      .rateLimit({ limit: 5, windowSeconds: 60 })
      .name('analytics-suite.api.exports.create')
  }
} as const;
```

Do not put React, DB, or handler-heavy imports here.

## `src/forms.ts` And `src/tables.ts`

Keep UI contracts stable and reusable:

```ts
// src/forms.ts
import { buildFormField, defineBuildForm } from '@skitsaas/sdk';

export const analyticsReportForm = defineBuildForm({
  id: 'mod.analytics-suite.form.report',
  fields: [
    buildFormField.text({
      name: 'name',
      label: 'Report name',
      required: true
    }),
    buildFormField.select({
      name: 'range',
      label: 'Date range',
      options: [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' }
      ]
    })
  ]
});
```

```ts
// src/tables.ts
import { buildTableColumn, defineBuildTable } from '@skitsaas/sdk';

export const analyticsReportsTable = defineBuildTable({
  id: 'mod.analytics-suite.table.reports',
  columns: [
    buildTableColumn.text({
      id: 'name',
      header: 'Name',
      accessorKey: 'name'
    }),
    buildTableColumn.text({
      id: 'range',
      header: 'Range',
      accessorKey: 'range'
    })
  ]
});
```

This keeps page files thin and gives the agent a stable place to look first.

## `src/actions.ts`

Use SDK server helpers, not host-only admin/dashboard wrappers:

```ts
'use server';

import {
  checkFeature,
  consumeQuota,
  createValidatedServerActionController,
  requireAdmin,
  requireUser,
  revalidatePaths
} from '@skitsaas/sdk/server';
import { analyticsReportForm } from './forms';
import { createAnalyticsReport } from './data';

const adminValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireAdmin()
});

const dashboardValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireUser()
});

export const createAnalyticsReportAdminAction = adminValidatedAction(
  analyticsReportForm,
  async ({ values }) => {
    await createAnalyticsReport({
      name: typeof values.name === 'string' ? values.name : '',
      range: typeof values.range === 'string' ? values.range : '30d'
    });

    await revalidatePaths([
      '/admin/custom/analytics-suite',
      '/admin/custom/analytics-suite/create'
    ]);
  }
);

export const createAnalyticsReportDashboardAction = dashboardValidatedAction(
  analyticsReportForm,
  async ({ user, values }) => {
    const quota = await checkFeature('analytics.exports.monthly', {
      teamId: null,
      userId: user.id
    });

    if (!quota.enabled || quota.exhausted) {
      throw new Error('Analytics exports are not available on this plan.');
    }

    await createAnalyticsReport({
      name: typeof values.name === 'string' ? values.name : '',
      range: typeof values.range === 'string' ? values.range : '30d'
    });

    await consumeQuota('analytics.exports.monthly', {
      teamId: null,
      userId: user.id
    });

    await revalidatePaths([
      '/dashboard/custom/analytics-suite',
      '/dashboard/custom/analytics-suite/create'
    ]);
  }
);
```

This is the clean pattern when the module needs both:

- area-aware server auth
- plan/quota enforcement in the server path

## `src/manifest.ts`

This is the real integration point that binds all surfaces together:

```ts
import { defineModule, EVENT_HOOKS } from '@skitsaas/sdk';
import {
  createModulePageRouter,
  notifyTeam
} from '@skitsaas/sdk/server';
import { AnalyticsSuiteRoutes } from './routes';
import {
  createAnalyticsReportAdminAction,
  createAnalyticsReportDashboardAction
} from './actions';
import { analyticsReportForm } from './forms';
import { analyticsReportsTable } from './tables';
import {
  AnalyticsAdminWidget,
  AnalyticsDashboardWidget
} from './widgets';

const adminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () =>
        renderAnalyticsAdminHomePage({
          table: analyticsReportsTable
        })
    },
    {
      path: '/create',
      handler: () =>
        renderAnalyticsAdminCreatePage({
          form: analyticsReportForm,
          action: createAnalyticsReportAdminAction
        })
    }
  ]
});

const dashboardPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () =>
        renderAnalyticsDashboardHomePage({
          table: analyticsReportsTable
        })
    },
    {
      path: '/create',
      handler: () =>
        renderAnalyticsDashboardCreatePage({
          form: analyticsReportForm,
          action: createAnalyticsReportDashboardAction
        })
    }
  ]
});

export default defineModule({
  moduleId: 'mod.analytics-suite',
  version: '0.1.0',
  displayName: 'Analytics Suite',
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
  apiRoutes: [
    AnalyticsSuiteRoutes.api.exportCsv.handler(async (_request) => {
      return Response.json({ ok: true });
    })
  ],
  eventHandlers: [
    {
      id: 'mod.analytics-suite.notify-after-checkout',
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
  ],
  templatePack: {
    contractRange: '^1.0.0',
    defaults: [
      {
        componentId: 'ui.table',
        templateId: 'mod.analytics-suite.default.table'
      }
    ],
    overrides: [
      {
        componentId: 'ui.async-submit-button',
        templateId: 'mod.analytics-suite.override.async-submit',
        lockTemplate: true
      }
    ]
  },
  adminPage,
  dashboardPage
});
```

This is the main answer to the prompt:
"where do aliases, widgets, typed API, events, and templates actually meet?"

The answer is: in `manifest.ts`, not split randomly across page files.

## Page Composition Rule

Keep renderers thin:

- page files compose form/table contracts
- page files receive server actions from `actions.ts`
- page files do not redefine route aliases or notification behavior

If a prompt asks for "edit one admin screen", do not spread the answer across
`routes.ts`, `manifest.ts`, and page JSX unless the change truly crosses those
boundaries.

## Prompt Shortcuts

If the user asks for:

- "admin and dashboard aliases plus nav items"
  start with `routes.ts` and `manifest.ts`
- "typed API with auth and rate limit"
  start with `routes.ts`, then `manifest.ts`
- "widget plus notification after checkout"
  start with `manifest.ts`
- "plan-aware action"
  start with `actions.ts`
- "form and table shape"
  start with `forms.ts` and `tables.ts`

## Validation Checklist

Before calling the module ready, verify:

1. `pnpm modules:prepare`
2. module aliases resolve in admin and dashboard
3. typed API route responds with the expected auth contract
4. widget injection only appears when the module is enabled
5. event-driven notification reaches `/api/notifications`
6. plan/quota gate is enforced in the server path

## Related Docs

- `./source-host-worked-example.md`
- `./source-package-worked-example.md`
- `./navigation-widgets-and-notifications.md`
- `./permissions-and-actions.md`
- `../notifications-and-delivery.md`
- `../subscriptions-and-features.md`
