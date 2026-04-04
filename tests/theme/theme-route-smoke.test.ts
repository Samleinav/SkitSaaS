import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { THEME_CODE_REGISTRY } from '../../lib/themes/code-registry.generated';
import { EXTERNAL_THEME_PACKS } from '../../lib/themes/external.generated';
import { THEME_FRONTEND_ROUTE_REGISTRY } from '../../lib/themes/frontend-routes.generated';

function readFileOrThrow(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(absolutePath), `Missing file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

test('theme registries expose required frontend routes and backoffice templates', () => {
  const frontendRouteRegistry = THEME_FRONTEND_ROUTE_REGISTRY['theme.first.frontend'];
  assert.ok(frontendRouteRegistry);

  const backofficeRegistry = THEME_CODE_REGISTRY['theme.first.backoffice'];
  assert.ok(backofficeRegistry);
  assert.ok(backofficeRegistry.templates['layout.private.shell']);
  assert.ok(backofficeRegistry.templates['layout.admin.shell']);
  assert.ok(backofficeRegistry.templates['layout.admin.app-config.shell']);
  assert.ok(backofficeRegistry.templates['layout.private.header']);
  assert.ok(backofficeRegistry.templates['layout.dashboard.shell']);
  assert.ok(backofficeRegistry.templates['page.admin.home']);
  assert.ok(backofficeRegistry.templates['page.admin.logs']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.home']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.general']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.payment-methods']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.email']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.modules']);
  assert.ok(backofficeRegistry.templates['page.admin.app-config.theme']);
  assert.ok(backofficeRegistry.templates['page.admin.users']);
  assert.ok(backofficeRegistry.templates['page.admin.user.detail']);
  assert.ok(backofficeRegistry.templates['page.admin.subscriptions.templates']);
  assert.ok(backofficeRegistry.templates['page.admin.subscriptions.create']);
  assert.ok(backofficeRegistry.templates['page.admin.subscriptions.edit']);
  assert.ok(backofficeRegistry.templates['page.admin.orders']);
  assert.ok(backofficeRegistry.templates['page.admin.orders.create']);
  assert.ok(backofficeRegistry.templates['page.admin.orders.edit']);
  assert.ok(backofficeRegistry.templates['page.admin.payments']);
  assert.ok(backofficeRegistry.templates['page.admin.suscriptions']);
  assert.ok(backofficeRegistry.templates['page.admin.suscriptions.user.edit']);
  assert.ok(
    backofficeRegistry.templates['page.admin.suscriptions.organization.edit']
  );
  assert.ok(backofficeRegistry.templates['page.dashboard.home']);
  assert.ok(backofficeRegistry.templates['page.dashboard.general']);
  assert.ok(backofficeRegistry.templates['page.dashboard.activity']);
  assert.ok(backofficeRegistry.templates['page.dashboard.activity.loading']);
  assert.ok(backofficeRegistry.templates['page.dashboard.security']);
  assert.ok(backofficeRegistry.templates['page.dashboard.subscriptions']);
  assert.ok(backofficeRegistry.templates['page.login.user']);
  assert.ok(backofficeRegistry.templates['page.login.admin']);
  assert.ok(backofficeRegistry.templates['page.login.signup']);
  assert.ok(backofficeRegistry.templates['section.admin.nav']);
  assert.ok(backofficeRegistry.templates['section.admin.breadcrumb']);
  assert.ok(backofficeRegistry.templates['section.admin.app-config-nav']);
  assert.ok(backofficeRegistry.templates['section.admin.app-config-nav.panel']);
  assert.ok(backofficeRegistry.templates['section.admin.app-config-nav.item']);
  assert.ok(backofficeRegistry.templates['section.admin.dashboard.overview']);
  assert.ok(backofficeRegistry.templates['section.admin.dashboard.quick-links']);
  assert.ok(backofficeRegistry.templates['section.admin.dashboard.recent-activity']);
  assert.ok(backofficeRegistry.templates['section.admin.dashboard.module-widget']);
  assert.ok(backofficeRegistry.templates['section.admin.table.users.cell']);
  assert.ok(backofficeRegistry.templates['section.admin.table.orders.cell']);
  assert.ok(backofficeRegistry.templates['section.admin.table.subscriptions.cell']);
  assert.ok(
    backofficeRegistry.templates['section.admin.table.subscriptions.templates.cell']
  );
  assert.ok(backofficeRegistry.templates['section.admin.table.payments.cell']);
  assert.ok(backofficeRegistry.templates['section.admin.table.logs.cell']);
  assert.ok(backofficeRegistry.templates['section.admin.table.suscriptions.user.cell']);
  assert.ok(
    backofficeRegistry.templates[
      'section.dashboard.table.subscriptions.organizations.cell'
    ]
  );
  assert.ok(
    backofficeRegistry.templates[
      'section.dashboard.table.subscriptions.payments.cell'
    ]
  );
  assert.ok(
    backofficeRegistry.templates[
      'section.dashboard.table.subscriptions.invoices.cell'
    ]
  );
  assert.ok(backofficeRegistry.templates['section.admin.metrics-grid']);
  assert.ok(backofficeRegistry.templates['ui.table']);
  assert.ok(backofficeRegistry.templates['ui.table.control']);
  assert.ok(backofficeRegistry.templates['ui.alert-dialog']);
  assert.ok(backofficeRegistry.templates['ui.async-submit-button']);
  assert.ok(backofficeRegistry.templates['ui.dialog']);
  assert.ok(backofficeRegistry.templates['ui.theme-toggle']);
  assert.ok(backofficeRegistry.templates['ui.language-switcher']);
  assert.ok(backofficeRegistry.templates['ui.user-menu']);
  assert.ok(backofficeRegistry.templates['system.not-found']);
});

test('external theme packs expose expected asset source per first theme', () => {
  const frontendPack = EXTERNAL_THEME_PACKS.find(
    (pack) => pack.themeId === 'theme.first.frontend'
  );
  assert.ok(frontendPack);
  assert.equal(frontendPack.entryAssetsPath, null);
  assert.equal(frontendPack.hasThemeConfig, true);

  const backofficePack = EXTERNAL_THEME_PACKS.find(
    (pack) => pack.themeId === 'theme.first.backoffice'
  );
  assert.ok(backofficePack);
  assert.equal(backofficePack.entryAssetsPath, null);
  assert.equal(backofficePack.hasThemeConfig, true);
});

test('core routes reference expected renderer contracts for smoke paths', () => {
  const routeChecks: Array<{
    filePath: string;
    renderer:
      | 'ThemeCodeTemplate'
      | 'ThemeFrontendRoute'
      | 'resolveAndRenderFrontendThemeRoute'
      | 'ThemeTemplate'
      | 'AdminTableSlotTemplate'
      | 'DashboardTableSlotTemplate'
      | 'redirect';
    expectedSnippet: string;
  }> = [
    {
      filePath: 'app/(frontend)/page.tsx',
      renderer: 'ThemeFrontendRoute',
      expectedSnippet: 'path="/"'
    },
    {
      filePath: 'app/(frontend)/pricing/page.tsx',
      renderer: 'ThemeFrontendRoute',
      expectedSnippet: 'path="/pricing"'
    },
    {
      filePath: 'app/(frontend)/packs/page.tsx',
      renderer: 'redirect',
      expectedSnippet: "redirect('/pricing')"
    },
    {
      filePath: 'app/(frontend)/not-found.tsx',
      renderer: 'ThemeFrontendRoute',
      expectedSnippet: 'path="/404"'
    },
    {
      filePath: 'app/(frontend)/[...moduleAlias]/page.tsx',
      renderer: 'resolveAndRenderFrontendThemeRoute',
      expectedSnippet: 'resolveAndRenderFrontendThemeRoute'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.home"'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'section.admin.dashboard.overview'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'section.admin.dashboard.quick-links'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'section.admin.dashboard.recent-activity'
    },
    {
      filePath: 'app/(dashboard)/admin/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'section.admin.dashboard.module-widget'
    },
    {
      filePath: 'app/(dashboard)/dashboard/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.dashboard.home"'
    },
    {
      filePath: 'app/(dashboard)/private-area-shell.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="layout.private.shell"'
    },
    {
      filePath: 'app/(dashboard)/private-area-header.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="layout.private.header"'
    },
    {
      filePath: 'app/(dashboard)/private-area-header.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="ui.user-menu"'
    },
    {
      filePath: 'components/ui/data-table.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id={resolvedControlTemplateId}'
    },
    {
      filePath: 'components/ui/data-table.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: "slot: 'toolbar.filter'"
    },
    {
      filePath: 'components/ui/data-table.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: "slot: 'pagination.previous'"
    },
    {
      filePath: 'components/ui/data-table.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: "slot: 'toolbar.columns-toggle.menu-content'"
    },
    {
      filePath: 'components/ui/data-table.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: "slot: 'toolbar.columns-toggle.menu-item-label'"
    },
    {
      filePath: 'app/(dashboard)/dashboard/general/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.dashboard.general"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/activity/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.dashboard.activity"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/activity/loading.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="page.dashboard.activity.loading"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/security/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.dashboard.security"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/subscriptions/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.dashboard.subscriptions"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/subscriptions/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet:
        'id="section.dashboard.table.subscriptions.organizations.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/layout.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="layout.admin.app-config.shell"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/section-nav.client.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="section.admin.app-config-nav.panel"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/section-nav.client.tsx',
      renderer: 'ThemeTemplate',
      expectedSnippet: 'id="section.admin.app-config-nav.item"'
    },
    {
      filePath: 'app/(dashboard)/admin/users/columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.users.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/orders/order-columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.orders.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.subscriptions.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/logs/log-columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.logs.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/payments/payment-data-columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.payments.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/suscriptions/user-subscriptions-columns.tsx',
      renderer: 'AdminTableSlotTemplate',
      expectedSnippet: 'templateId="section.admin.table.suscriptions.user.cell"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx',
      renderer: 'DashboardTableSlotTemplate',
      expectedSnippet:
        'templateId="section.dashboard.table.subscriptions.payments.cell"'
    },
    {
      filePath: 'app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx',
      renderer: 'DashboardTableSlotTemplate',
      expectedSnippet:
        'templateId="section.dashboard.table.subscriptions.invoices.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.app-config.home"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/general/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.app-config.general"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/email/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.app-config.email"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/payments-methods/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.app-config.payment-methods"'
    },
    {
      filePath: 'app/(dashboard)/admin/app-config/modules/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.app-config.modules"'
    },
    {
      filePath: 'app/(dashboard)/admin/users/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.users"'
    },
    {
      filePath: 'app/(dashboard)/admin/users/[userId]/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.user.detail"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.suscriptions"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/templates/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.subscriptions.templates"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/templates/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet:
        'id="section.admin.table.subscriptions.templates.cell"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/templates/create/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.subscriptions.create"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/templates/[templateId]/edit/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.subscriptions.edit"'
    },
    {
      filePath: 'app/(dashboard)/admin/orders/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.orders"'
    },
    {
      filePath: 'app/(dashboard)/admin/orders/create/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.orders.create"'
    },
    {
      filePath: 'app/(dashboard)/admin/orders/[orderId]/edit/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.orders.edit"'
    },
    {
      filePath: 'app/(dashboard)/admin/payments/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.payments"'
    },
    {
      filePath: 'app/(dashboard)/admin/logs/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.logs"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/user/[userId]/edit/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.suscriptions.user.edit"'
    },
    {
      filePath: 'app/(dashboard)/admin/subscriptions/organization/[teamId]/edit/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.admin.suscriptions.organization.edit"'
    },
    {
      filePath: 'app/(login)/login/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.login.user"'
    },
    {
      filePath: 'app/(login)/admin/login/page.tsx',
      renderer: 'ThemeCodeTemplate',
      expectedSnippet: 'id="page.login.admin"'
    }
  ];

  for (const routeCheck of routeChecks) {
    const fileContents = readFileOrThrow(routeCheck.filePath);
    assert.match(fileContents, new RegExp(routeCheck.renderer));
    assert.ok(
      fileContents.includes(routeCheck.expectedSnippet),
      `${routeCheck.filePath} missing snippet: ${routeCheck.expectedSnippet}`
    );
  }
});

test('module dispatcher routes keep direct runtime handoff contract', () => {
  const dispatcherChecks: Array<{
    filePath: string;
    resolveSnippet: string;
  }> = [
    {
      filePath: 'app/(dashboard)/admin/modules/[moduleId]/[[...slug]]/page.tsx',
      resolveSnippet: 'resolveModulePage'
    },
    {
      filePath: 'app/(dashboard)/admin/[...moduleAlias]/page.tsx',
      resolveSnippet: 'resolveModulePageByPath'
    },
    {
      filePath: 'app/(dashboard)/dashboard/modules/[moduleId]/[[...slug]]/page.tsx',
      resolveSnippet: 'resolveModulePage'
    },
    {
      filePath: 'app/(dashboard)/dashboard/[...moduleAlias]/page.tsx',
      resolveSnippet: 'resolveModulePageByPath'
    }
  ];

  for (const dispatcherCheck of dispatcherChecks) {
    const fileContents = readFileOrThrow(dispatcherCheck.filePath);
    assert.ok(fileContents.includes(dispatcherCheck.resolveSnippet));
    assert.ok(fileContents.includes('if (!content)'));
    assert.ok(fileContents.includes('notFound()'));
    assert.ok(fileContents.includes('return content;'));
    assert.ok(!fileContents.includes('ThemeCodeTemplate'));
    assert.ok(!fileContents.includes('ThemeTemplate'));
  }
});

test('first backoffice theme keeps ui.table as code template without templates.json manifest', () => {
  const backofficeManifest = JSON.parse(
    readFileOrThrow('themes/first-backoffice/theme.json')
  ) as {
    entryTemplates?: string;
  };

  assert.equal(backofficeManifest.entryTemplates, undefined);
  assert.ok(
    fs.existsSync(
      path.join(process.cwd(), 'themes/first-backoffice/templates/ui.table.tsx')
    )
  );
});
