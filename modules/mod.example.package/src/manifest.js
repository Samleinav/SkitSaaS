import { defineModule } from '@skitsaas/sdk';
import { createModulePageRouter } from '@skitsaas/sdk/server';
import {
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
  EXAMPLE_PACKAGE_MODULE_ID,
  toPositiveInt
} from './constants';
import { examplePackageApiHandler } from './api-handler';
import {
  parseExamplePackageAdminItemId,
  renderExamplePackageAdminCreatePage,
  renderExamplePackageAdminEditPage,
  renderExamplePackageAdminHomePage,
  renderExamplePackageAdminSettingsPage
} from './pages/admin-pages.jsx';
import {
  renderExamplePackageDashboardCreatePage,
  renderExamplePackageDashboardHomePage,
  renderExamplePackageDashboardItemPage
} from './pages/dashboard-pages.jsx';
import { ExamplePackageAdminWidget, ExamplePackageDashboardWidget } from './widgets.jsx';

const examplePackageAdminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderExamplePackageAdminHomePage()
    },
    {
      path: '/create',
      handler: () => renderExamplePackageAdminCreatePage()
    },
    {
      path: '/settings',
      handler: () => renderExamplePackageAdminSettingsPage()
    },
    {
      path: '/edit/:itemId',
      handler: ({ params }) => {
        const itemId = parseExamplePackageAdminItemId(params.itemId);
        if (!itemId) {
          return null;
        }

        return renderExamplePackageAdminEditPage(itemId);
      }
    }
  ]
});

const examplePackageDashboardPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderExamplePackageDashboardHomePage()
    },
    {
      path: '/create',
      handler: () => renderExamplePackageDashboardCreatePage()
    },
    {
      path: '/items/:itemId',
      handler: ({ params }) => {
        const itemId = toPositiveInt(params.itemId);
        if (!itemId) {
          return null;
        }

        return renderExamplePackageDashboardItemPage(itemId);
      }
    }
  ]
});

export default defineModule({
  moduleId: EXAMPLE_PACKAGE_MODULE_ID,
  version: '0.1.0',
  displayName: 'Example Package',
  description:
    'Complete source-package module with own package.json, build step, pages, API, actions and widgets.',
  adminRouteAliases: [EXAMPLE_PACKAGE_ADMIN_ALIAS],
  dashboardRouteAliases: [EXAMPLE_PACKAGE_DASHBOARD_ALIAS],
  adminNavItems: [
    {
      id: 'mod.example.package.admin.nav',
      href: EXAMPLE_PACKAGE_ADMIN_ALIAS,
      label: 'Example Package',
      order: 95
    }
  ],
  dashboardNavItems: [
    {
      id: 'mod.example.package.dashboard.nav',
      href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
      label: 'Example Package',
      order: 95
    }
  ],
  adminDashboardWidgets: [
    {
      id: 'mod.example.package.widget.admin',
      Component: ExamplePackageAdminWidget,
      order: 75
    }
  ],
  dashboardWidgets: [
    {
      id: 'mod.example.package.widget.dashboard',
      Component: ExamplePackageDashboardWidget,
      order: 75
    }
  ],
  templatePack: {
    contractRange: '^1.0.0',
    defaults: [
      {
        componentId: 'ui.table',
        templateId: 'mod.example.package.default.table'
      }
    ],
    overrides: [
      {
        componentId: 'ui.async-submit-button',
        templateId: 'mod.example.package.override.async-submit',
        lockTemplate: true
      }
    ]
  },
  adminPage: examplePackageAdminPage,
  dashboardPage: examplePackageDashboardPage,
  apiHandler: examplePackageApiHandler
});
