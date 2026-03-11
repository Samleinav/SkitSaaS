import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import test from 'node:test';

type RouteSlotContract = {
  filePath: string;
  renderer:
    | 'ThemeCodeTemplate'
    | 'ThemeFrontendRoute'
    | 'ThemeTemplate'
    | 'AdminTableSlotTemplate'
    | 'DashboardTableSlotTemplate';
  requiredSnippets: readonly string[];
  requiredDataKeys: readonly string[];
  requiresFallbackProp: boolean;
  dataAnchorSnippet?: string;
};

const CRITICAL_ROUTE_SLOT_CONTRACTS: readonly RouteSlotContract[] = [
  {
    filePath: 'app/(frontend)/layout.tsx',
    renderer: 'ThemeFrontendRoute',
    requiredSnippets: ['path="/__layout"'],
    requiredDataKeys: [],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(frontend)/page.tsx',
    renderer: 'ThemeFrontendRoute',
    requiredSnippets: ['path="/"'],
    requiredDataKeys: ['viewCodeHref'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(frontend)/pricing/page.tsx',
    renderer: 'ThemeFrontendRoute',
    requiredSnippets: ['path="/pricing"'],
    requiredDataKeys: ['overviewItems', 'sectionLinks'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/private-area-shell.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="layout.private.shell"'],
    requiredDataKeys: ['area', 'route', 'projectName'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/layout.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: [
      'id="section.admin.nav"',
      'id="section.admin.breadcrumb"',
      'id="ui.theme-toggle"',
      'id="ui.language-switcher"',
      'id="layout.admin.shell"'
    ],
    requiredDataKeys: ['variant', 'mode', 'moduleItemsCount', 'projectName'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/layout-client.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="ui.theme-toggle"', 'id="ui.language-switcher"'],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/private-area-header.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: [
      'id="ui.language-switcher"',
      'id="ui.user-menu"',
      'id="layout.private.header"'
    ],
    requiredDataKeys: ['area', 'controlsSlot', 'projectName'],
    requiresFallbackProp: true,
    dataAnchorSnippet: 'id="layout.private.header"'
  },
  {
    filePath: 'components/ui/themed-async-submit-button.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="ui.async-submit-button"'],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'components/ui/themed-confirm-submit-button.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="ui.alert-dialog"'],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'components/ui/data-table.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: [
      'id={resolvedControlTemplateId}',
      "slot: 'toolbar.filter'",
      "slot: 'toolbar.columns-toggle.menu-content'",
      "slot: 'toolbar.columns-toggle.menu-item-label'"
    ],
    requiredDataKeys: [
      'area',
      'componentId',
      'templateId',
      'templateSource'
    ],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/users/create-user-dialog.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="ui.dialog"'],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/payments/payment-data-columns.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="ui.alert-dialog"'],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/layout.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: [
      'id="section.admin.app-config-nav"',
      'id="layout.admin.app-config.shell"'
    ],
    requiredDataKeys: ['section'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/section-nav.client.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: [
      'id="section.admin.app-config-nav.panel"',
      'id="section.admin.app-config-nav.item"'
    ],
    requiredDataKeys: ['area', 'slot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/users/columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: ['templateId="section.admin.table.users.cell"', 'slot="'],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/orders/order-columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: ['templateId="section.admin.table.orders.cell"', 'slot="'],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/subscriptions/columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: [
      'templateId="section.admin.table.subscriptions.cell"',
      'slot="'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/logs/log-columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: ['templateId="section.admin.table.logs.cell"', 'slot="'],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/payments/payment-data-columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: [
      'templateId="section.admin.table.payments.cell"',
      'slot="'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/suscriptions/user-subscriptions-columns.tsx',
    renderer: 'AdminTableSlotTemplate',
    requiredSnippets: [
      'templateId="section.admin.table.suscriptions.user.cell"',
      'slot="'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/dashboard/subscriptions/payments-data-table.tsx',
    renderer: 'DashboardTableSlotTemplate',
    requiredSnippets: [
      'templateId="section.dashboard.table.subscriptions.payments.cell"',
      'slot="'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/dashboard/subscriptions/invoices-data-table.tsx',
    renderer: 'DashboardTableSlotTemplate',
    requiredSnippets: [
      'templateId="section.dashboard.table.subscriptions.invoices.cell"',
      'slot="'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: false
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.app-config.home"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/general/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.app-config.general"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/payments-methods/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.app-config.payment-methods"'],
    requiredDataKeys: ['title', 'description', 'provider'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/modules/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.app-config.modules"'],
    requiredDataKeys: ['title', 'description', 'runtimeMode'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/app-config/email/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.app-config.email"'],
    requiredDataKeys: ['title', 'description', 'provider'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: [
      'section.admin.dashboard.overview',
      'section.admin.dashboard.quick-links',
      'section.admin.dashboard.recent-activity',
      'section.admin.dashboard.module-widget',
      'id="page.admin.home"'
    ],
    requiredDataKeys: [
      'title',
      'moduleWidgetId',
      'moduleWidgetIndex',
      'moduleWidgetKind'
    ],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/layout.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="layout.dashboard.shell"'],
    requiredDataKeys: ['heading', 'layoutStyle', 'mode', 'projectName', 'contentSlot'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.dashboard.home"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/general/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.dashboard.general"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/activity/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.dashboard.activity"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/activity/loading.tsx',
    renderer: 'ThemeTemplate',
    requiredSnippets: ['id="page.dashboard.activity.loading"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/security/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.dashboard.security"'],
    requiredDataKeys: ['title', 'description'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/subscriptions/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: [
      'id="page.dashboard.subscriptions"',
      'id="section.dashboard.table.subscriptions.organizations.cell"'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(login)/login/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.login.user"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(login)/admin/login/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.login.admin"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(login)/sign-up/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.login.signup"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(frontend)/not-found.tsx',
    renderer: 'ThemeFrontendRoute',
    requiredSnippets: ['path="/404"'],
    requiredDataKeys: ['title', 'message'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/not-found.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id={templateId}', "?? 'system.not-found'"],
    requiredDataKeys: ['title', 'message'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/users/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="section.admin.metrics-grid"', 'id="page.admin.users"'],
    requiredDataKeys: ['variant', 'columns'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/payments/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="section.admin.metrics-grid"', 'id="page.admin.payments"'],
    requiredDataKeys: ['variant', 'columns'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/orders/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="section.admin.metrics-grid"', 'id="page.admin.orders"'],
    requiredDataKeys: ['variant', 'columns'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/orders/create/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.orders.create"'],
    requiredDataKeys: ['title', 'description', 'initialTargetType'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/orders/[orderId]/edit/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.orders.edit"'],
    requiredDataKeys: ['title', 'description', 'orderId'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/suscriptions/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="section.admin.metrics-grid"', 'id="page.admin.suscriptions"'],
    requiredDataKeys: ['variant', 'columns'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/suscriptions/user/[userId]/edit/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.suscriptions.user.edit"'],
    requiredDataKeys: ['title', 'description', 'userId'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/suscriptions/organization/[teamId]/edit/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.suscriptions.organization.edit"'],
    requiredDataKeys: ['title', 'description', 'teamId'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/subscriptions/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: [
      'id="page.admin.subscriptions.templates"',
      'id="section.admin.table.subscriptions.templates.cell"'
    ],
    requiredDataKeys: [],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/subscriptions/create/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.subscriptions.create"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/subscriptions/[templateId]/edit/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.subscriptions.edit"'],
    requiredDataKeys: ['title'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/logs/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.logs"'],
    requiredDataKeys: ['title', 'description', 'tab'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/admin/users/[userId]/page.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id="page.admin.user.detail"'],
    requiredDataKeys: ['title', 'description', 'userId'],
    requiresFallbackProp: true
  },
  {
    filePath: 'app/(dashboard)/dashboard/not-found.tsx',
    renderer: 'ThemeCodeTemplate',
    requiredSnippets: ['id={templateId}', "?? 'system.not-found'"],
    requiredDataKeys: ['title', 'message'],
    requiresFallbackProp: true
  }
];

function readFileOrThrow(relativePath: string) {
  const absolutePath = path.join(process.cwd(), relativePath);
  assert.ok(fs.existsSync(absolutePath), `Missing route file: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function listCodeFiles(rootDir: string): string[] {
  const skippedDirs = new Set<string>([
    'node_modules',
    '.next',
    '.pnpm',
    '.ignored',
    'sdk'
  ]);
  const queue: string[] = [rootDir];
  const results: string[] = [];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir) {
      continue;
    }

    const entries = fs.readdirSync(currentDir, {
      withFileTypes: true
    }) as Dirent[];

    for (const entry of entries) {
      if (entry.isDirectory() && skippedDirs.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }

      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        results.push(absolutePath);
      }
    }
  }

  return results;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasObjectDataKey(dataExpression: string, dataKey: string) {
  const escapedKey = escapeRegExp(dataKey);
  const explicitPropertyPattern = new RegExp(`\\b${escapedKey}\\s*:`);
  const shorthandPropertyPattern = new RegExp(
    `(^|[,{]\\s*)${escapedKey}(?=\\s*[,}])`,
    'm'
  );

  return (
    explicitPropertyPattern.test(dataExpression) ||
    shorthandPropertyPattern.test(dataExpression)
  );
}

function extractThemeTemplateDataExpression(
  source: string,
  anchorSnippet?: string
) {
  const marker = 'data={';
  let searchIndex = 0;

  if (anchorSnippet) {
    const anchorIndex = source.indexOf(anchorSnippet);
    if (anchorIndex < 0) {
      return null;
    }

    searchIndex = anchorIndex;
  }

  while (searchIndex < source.length) {
    const markerIndex = source.indexOf(marker, searchIndex);
    if (markerIndex < 0) {
      return null;
    }

    let index = markerIndex + marker.length;
    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }

    if (source[index] !== '{') {
      searchIndex = markerIndex + marker.length;
      continue;
    }

    let depth = 0;
    for (
      let currentIndex = index;
      currentIndex < source.length;
      currentIndex += 1
    ) {
      const char = source[currentIndex];
      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(index, currentIndex + 1);
        }
      }
    }

    searchIndex = markerIndex + marker.length;
  }

  return null;
}

test('critical routes keep expected slot data contracts and fallback strategy', () => {
  for (const routeContract of CRITICAL_ROUTE_SLOT_CONTRACTS) {
    const fileContents = readFileOrThrow(routeContract.filePath);
    assert.match(
      fileContents,
      new RegExp(routeContract.renderer),
      `${routeContract.filePath} must use ${routeContract.renderer}`
    );

    for (const snippet of routeContract.requiredSnippets) {
      assert.ok(
        fileContents.includes(snippet),
        `${routeContract.filePath} is missing snippet: ${snippet}`
      );
    }

    if (routeContract.requiresFallbackProp) {
      assert.match(
        fileContents,
        /\bfallback=\{/,
        `${routeContract.filePath} must pass fallback prop`
      );
    }

    const dataExpression = extractThemeTemplateDataExpression(
      fileContents,
      routeContract.dataAnchorSnippet
    );
    assert.ok(
      dataExpression,
      `${routeContract.filePath} must provide a data expression`
    );

    for (const dataKey of routeContract.requiredDataKeys) {
      assert.ok(
        hasObjectDataKey(dataExpression!, dataKey),
        `${routeContract.filePath} must provide data key: ${dataKey}`
      );
    }
  }
});

test('submit buttons in app/layout stay behind template wrappers', () => {
  const allowedSubmitFiles = new Set<string>([
    'components/ui/async-submit-button.tsx',
    'components/ui/confirm-submit-button.tsx'
  ]);

  const roots = ['app', path.join('components', 'layout')];
  const submitUsages: string[] = [];

  for (const root of roots) {
    const absoluteRoot = path.join(process.cwd(), root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }

    for (const absoluteFilePath of listCodeFiles(absoluteRoot)) {
      const relativePath = path
        .relative(process.cwd(), absoluteFilePath)
        .replace(/\\/g, '/');
      const contents = fs.readFileSync(absoluteFilePath, 'utf8');

      if (!contents.includes('type="submit"')) {
        continue;
      }

      if (allowedSubmitFiles.has(relativePath)) {
        continue;
      }

      const lineNumber =
        contents.slice(0, contents.indexOf('type="submit"')).split('\n').length;
      submitUsages.push(`${relativePath}:${lineNumber}`);
    }
  }

  assert.equal(
    submitUsages.length,
    0,
    `Unexpected submit button usage outside wrappers:\n${submitUsages.join('\n')}`
  );
});

test('dialog primitives in app stay wrapped by template renderers', () => {
  const dialogViolations: string[] = [];
  const absoluteRoot = path.join(process.cwd(), 'app');

  for (const absoluteFilePath of listCodeFiles(absoluteRoot)) {
    const relativePath = path
      .relative(process.cwd(), absoluteFilePath)
      .replace(/\\/g, '/');
    const contents = fs.readFileSync(absoluteFilePath, 'utf8');

    const usesDialogPrimitiveImport = contents.includes(
      "from '@/components/ui/dialog'"
    );
    const usesAlertDialogPrimitiveImport = contents.includes(
      "from '@/components/ui/alert-dialog'"
    );

    if (!usesDialogPrimitiveImport && !usesAlertDialogPrimitiveImport) {
      continue;
    }

    const hasTemplateRenderer =
      contents.includes('ThemeCodeTemplate') || contents.includes('ThemeTemplate');
    const hasFallbackProp = /\bfallback=\{/.test(contents);
    const hasDialogTemplateId = usesDialogPrimitiveImport
      ? contents.includes('id="ui.dialog"')
      : true;
    const hasAlertDialogTemplateId = usesAlertDialogPrimitiveImport
      ? contents.includes('id="ui.alert-dialog"')
      : true;

    if (
      !hasTemplateRenderer ||
      !hasFallbackProp ||
      !hasDialogTemplateId ||
      !hasAlertDialogTemplateId
    ) {
      dialogViolations.push(relativePath);
    }
  }

  assert.equal(
    dialogViolations.length,
    0,
    `Unexpected dialog primitive usage without template wrapper:\n${dialogViolations.join('\n')}`
  );
});
