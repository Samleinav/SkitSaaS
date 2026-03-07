import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_DASHBOARD_ALIAS,
  EXAMPLE_SUITE_MODULE_ID
} from './constants';
import { exampleSuiteApiHandler } from './api-handler';
import {
  renderExampleSuiteAdminCreatePage,
  renderExampleSuiteAdminEditPage,
  renderExampleSuiteAdminHomePage,
  renderExampleSuiteAdminSettingsPage
} from './pages/admin-pages';
import {
  renderExampleSuiteDashboardCreatePage,
  renderExampleSuiteDashboardHomePage,
  renderExampleSuiteDashboardItemPage
} from './pages/dashboard-pages';
import { ExampleSuiteAdminWidget, ExampleSuiteDashboardWidget } from './widgets';

function toPositiveInt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

const exampleSuiteAdminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderExampleSuiteAdminHomePage()
    },
    {
      path: '/create',
      handler: () => renderExampleSuiteAdminCreatePage()
    },
    {
      path: '/settings',
      handler: () => renderExampleSuiteAdminSettingsPage()
    },
    {
      path: '/edit/:itemId',
      handler: ({ params }) => {
        const itemId = toPositiveInt(params.itemId);
        if (!itemId) {
          return null;
        }

        return renderExampleSuiteAdminEditPage(itemId);
      }
    }
  ]
});

const exampleSuiteDashboardPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderExampleSuiteDashboardHomePage()
    },
    {
      path: '/create',
      handler: () => renderExampleSuiteDashboardCreatePage()
    },
    {
      path: '/items/:itemId',
      handler: ({ params }) => {
        const itemId = toPositiveInt(params.itemId);
        if (!itemId) {
          return null;
        }

        return renderExampleSuiteDashboardItemPage(itemId);
      }
    }
  ]
});

export default defineModule({
  moduleId: EXAMPLE_SUITE_MODULE_ID,
  version: '0.1.0',
  displayName: 'Example Suite',
  description:
    'Complete module example with DB tables, admin/dashboard pages, actions and API.',
  adminRouteAliases: [EXAMPLE_SUITE_ADMIN_ALIAS],
  dashboardRouteAliases: [EXAMPLE_SUITE_DASHBOARD_ALIAS],
  adminNavItems: [
    {
      id: 'mod.example.suite.admin.nav',
      href: EXAMPLE_SUITE_ADMIN_ALIAS,
      label: 'Example Suite',
      order: 90
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.example.suite.dashboard.nav',
      href: EXAMPLE_SUITE_DASHBOARD_ALIAS,
      label: 'Example Suite',
      order: 90
    }
  ],
  adminDashboardWidgets: [
    {
      id: 'mod.example.suite.widget.admin',
      Component: ExampleSuiteAdminWidget,
      order: 70
    }
  ],
  dashboardWidgets: [
    {
      id: 'mod.example.suite.widget.dashboard',
      Component: ExampleSuiteDashboardWidget,
      order: 70
    }
  ],
  templatePack: {
    contractRange: '^1.0.0',
    defaults: [
      {
        componentId: 'ui.table',
        templateId: 'mod.example.suite.default.table'
      },
      {
        componentId: 'ui.form',
        templateId: 'mod.example.suite.default.form',
        payload: {
          formClassName: 'space-y-5',
          sectionClassName: 'space-y-3',
          checkboxWrapperClassName: 'bg-muted/20'
        }
      }
    ],
    overrides: [
      {
        componentId: 'ui.async-submit-button',
        templateId: 'mod.example.suite.override.async-submit',
        lockTemplate: true
      }
    ]
  },
  adminPage: exampleSuiteAdminPage,
  dashboardPage: exampleSuiteDashboardPage,
  apiHandler: exampleSuiteApiHandler
} satisfies ModuleManifest);
