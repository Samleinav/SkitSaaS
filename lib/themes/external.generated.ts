import type { ThemePackManifest } from './manifest';

export type CodeTemplateRegistryEntry = {
  componentId: string;
  filePath: string;
};

export type ExternalThemePack = ThemePackManifest & {
  packDir: string;
  entryTokensPath: string;
  entryTemplatesPath: string | null;
  entryAssetsPath: string | null;
  themeCompatible: boolean | null;
  codeTemplates: CodeTemplateRegistryEntry[];
  hasThemeConfig: boolean;
  themeConfigImportPath?: string | null;
  hasFrontendRoutes: boolean;
  frontendRoutesImportPath?: string | null;
};

export const EXTERNAL_THEME_PACKS: ExternalThemePack[] = [
  {
    "themeId": "theme.first.backoffice",
    "version": "1.0.0",
    "areas": [
      "admin",
      "dashboard"
    ],
    "mode": "tokens",
    "entryTokens": "tokens.css",
    "themeRange": "^1.0.0",
    "packDir": "themes/first-backoffice",
    "entryTokensPath": "themes/first-backoffice/tokens.css",
    "entryTemplatesPath": null,
    "entryAssetsPath": null,
    "themeCompatible": true,
    "codeTemplates": [
      {
        "componentId": "layout.admin.app-config.shell",
        "filePath": "themes/first-backoffice/templates/admin/layout.admin.app-config.shell.tsx"
      },
      {
        "componentId": "layout.admin.shell",
        "filePath": "themes/first-backoffice/templates/admin/layout.admin.shell.tsx"
      },
      {
        "componentId": "layout.dashboard.shell",
        "filePath": "themes/first-backoffice/templates/dashboard/layout.dashboard.shell.tsx"
      },
      {
        "componentId": "layout.private.header",
        "filePath": "themes/first-backoffice/templates/layout.private.header.tsx"
      },
      {
        "componentId": "layout.private.shell",
        "filePath": "themes/first-backoffice/templates/layout.private.shell.tsx"
      },
      {
        "componentId": "page.admin.app-config.email",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.app-config.email.tsx"
      },
      {
        "componentId": "page.admin.app-config.general",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.app-config.general.tsx"
      },
      {
        "componentId": "page.admin.app-config.home",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.app-config.home.tsx"
      },
      {
        "componentId": "page.admin.app-config.payment-methods",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.app-config.payment-methods.tsx"
      },
      {
        "componentId": "page.admin.app-config.theme",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.app-config.theme.tsx"
      },
      {
        "componentId": "page.admin.home",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.home.tsx"
      },
      {
        "componentId": "page.admin.logs",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.logs.tsx"
      },
      {
        "componentId": "page.admin.orders",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.orders.tsx"
      },
      {
        "componentId": "page.admin.orders.create",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.orders.create.tsx"
      },
      {
        "componentId": "page.admin.orders.edit",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.orders.edit.tsx"
      },
      {
        "componentId": "page.admin.payments",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.payments.tsx"
      },
      {
        "componentId": "page.admin.subscriptions.create",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.subscriptions.create.tsx"
      },
      {
        "componentId": "page.admin.subscriptions.edit",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.subscriptions.edit.tsx"
      },
      {
        "componentId": "page.admin.subscriptions.templates",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.subscriptions.templates.tsx"
      },
      {
        "componentId": "page.admin.suscriptions",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.suscriptions.tsx"
      },
      {
        "componentId": "page.admin.suscriptions.organization.edit",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.suscriptions.organization.edit.tsx"
      },
      {
        "componentId": "page.admin.suscriptions.user.edit",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.suscriptions.user.edit.tsx"
      },
      {
        "componentId": "page.admin.user.detail",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.user.detail.tsx"
      },
      {
        "componentId": "page.admin.users",
        "filePath": "themes/first-backoffice/templates/admin/page.admin.users.tsx"
      },
      {
        "componentId": "page.dashboard.activity",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.activity.tsx"
      },
      {
        "componentId": "page.dashboard.activity.loading",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.activity.loading.tsx"
      },
      {
        "componentId": "page.dashboard.general",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.general.tsx"
      },
      {
        "componentId": "page.dashboard.home",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.home.tsx"
      },
      {
        "componentId": "page.dashboard.security",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.security.tsx"
      },
      {
        "componentId": "page.dashboard.subscriptions",
        "filePath": "themes/first-backoffice/templates/dashboard/page.dashboard.subscriptions.tsx"
      },
      {
        "componentId": "page.login.admin",
        "filePath": "themes/first-backoffice/templates/page.login.admin.tsx"
      },
      {
        "componentId": "page.login.signup",
        "filePath": "themes/first-backoffice/templates/page.login.signup.tsx"
      },
      {
        "componentId": "page.login.user",
        "filePath": "themes/first-backoffice/templates/page.login.user.tsx"
      },
      {
        "componentId": "section.admin.app-config-nav",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.app-config-nav.tsx"
      },
      {
        "componentId": "section.admin.app-config-nav.item",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.app-config-nav.item.tsx"
      },
      {
        "componentId": "section.admin.app-config-nav.panel",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.app-config-nav.panel.tsx"
      },
      {
        "componentId": "section.admin.breadcrumb",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.breadcrumb.tsx"
      },
      {
        "componentId": "section.admin.dashboard.module-widget",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.dashboard.module-widget.tsx"
      },
      {
        "componentId": "section.admin.dashboard.overview",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.dashboard.overview.tsx"
      },
      {
        "componentId": "section.admin.dashboard.quick-links",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.dashboard.quick-links.tsx"
      },
      {
        "componentId": "section.admin.dashboard.recent-activity",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.dashboard.recent-activity.tsx"
      },
      {
        "componentId": "section.admin.metrics-grid",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.metrics-grid.tsx"
      },
      {
        "componentId": "section.admin.nav",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.nav.tsx"
      },
      {
        "componentId": "section.admin.table.logs.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.logs.cell.tsx"
      },
      {
        "componentId": "section.admin.table.orders.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.orders.cell.tsx"
      },
      {
        "componentId": "section.admin.table.payments.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.payments.cell.tsx"
      },
      {
        "componentId": "section.admin.table.subscriptions.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.subscriptions.cell.tsx"
      },
      {
        "componentId": "section.admin.table.subscriptions.templates.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.subscriptions.templates.cell.tsx"
      },
      {
        "componentId": "section.admin.table.suscriptions.user.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.suscriptions.user.cell.tsx"
      },
      {
        "componentId": "section.admin.table.users.cell",
        "filePath": "themes/first-backoffice/templates/admin/section.admin.table.users.cell.tsx"
      },
      {
        "componentId": "section.dashboard.table.subscriptions.invoices.cell",
        "filePath": "themes/first-backoffice/templates/dashboard/section.dashboard.table.subscriptions.invoices.cell.tsx"
      },
      {
        "componentId": "section.dashboard.table.subscriptions.organizations.cell",
        "filePath": "themes/first-backoffice/templates/dashboard/section.dashboard.table.subscriptions.organizations.cell.tsx"
      },
      {
        "componentId": "section.dashboard.table.subscriptions.payments.cell",
        "filePath": "themes/first-backoffice/templates/dashboard/section.dashboard.table.subscriptions.payments.cell.tsx"
      },
      {
        "componentId": "system.not-found",
        "filePath": "themes/first-backoffice/templates/system.not-found.tsx"
      },
      {
        "componentId": "ui.alert-dialog",
        "filePath": "themes/first-backoffice/templates/ui.alert-dialog.tsx"
      },
      {
        "componentId": "ui.async-submit-button",
        "filePath": "themes/first-backoffice/templates/ui.async-submit-button.tsx"
      },
      {
        "componentId": "ui.dialog",
        "filePath": "themes/first-backoffice/templates/ui.dialog.tsx"
      },
      {
        "componentId": "ui.language-switcher",
        "filePath": "themes/first-backoffice/templates/ui.language-switcher.tsx"
      },
      {
        "componentId": "ui.table",
        "filePath": "themes/first-backoffice/templates/ui.table.tsx"
      },
      {
        "componentId": "ui.table.control",
        "filePath": "themes/first-backoffice/templates/ui.table.control.tsx"
      },
      {
        "componentId": "ui.theme-toggle",
        "filePath": "themes/first-backoffice/templates/ui.theme-toggle.tsx"
      },
      {
        "componentId": "ui.user-menu",
        "filePath": "themes/first-backoffice/templates/ui.user-menu.tsx"
      }
    ],
    "hasThemeConfig": true,
    "themeConfigImportPath": "themes/first-backoffice/config",
    "hasFrontendRoutes": false,
    "frontendRoutesImportPath": null
  },
  {
    "themeId": "theme.first.frontend",
    "version": "1.0.0",
    "areas": [
      "frontend"
    ],
    "mode": "tokens",
    "entryTokens": "tokens.css",
    "themeRange": "^1.0.0",
    "packDir": "themes/first-frontend",
    "entryTokensPath": "themes/first-frontend/tokens.css",
    "entryTemplatesPath": "themes/first-frontend/templates.json",
    "entryAssetsPath": null,
    "themeCompatible": true,
    "codeTemplates": [
      {
        "componentId": "layout.frontend.shell",
        "filePath": "themes/first-frontend/templates/layout.frontend.shell.tsx"
      },
      {
        "componentId": "page.frontend.home",
        "filePath": "themes/first-frontend/templates/page.frontend.home.tsx"
      },
      {
        "componentId": "page.frontend.pricing",
        "filePath": "themes/first-frontend/templates/page.frontend.pricing.tsx"
      },
      {
        "componentId": "system.not-found",
        "filePath": "themes/first-frontend/templates/system.not-found.tsx"
      }
    ],
    "hasThemeConfig": true,
    "themeConfigImportPath": "themes/first-frontend/config",
    "hasFrontendRoutes": true,
    "frontendRoutesImportPath": "themes/first-frontend/routes"
  },
  {
    "themeId": "theme.frontend.sandbox",
    "version": "1.0.0",
    "areas": [
      "frontend"
    ],
    "mode": "tokens",
    "entryTokens": "tokens.css",
    "themeRange": "^1.0.0",
    "packDir": "themes/frontend-sandbox",
    "entryTokensPath": "themes/frontend-sandbox/tokens.css",
    "entryTemplatesPath": "themes/frontend-sandbox/templates.json",
    "entryAssetsPath": null,
    "themeCompatible": true,
    "codeTemplates": [],
    "hasThemeConfig": false,
    "themeConfigImportPath": null,
    "hasFrontendRoutes": false,
    "frontendRoutesImportPath": null
  },
  {
    "themeId": "theme.pilot.admin",
    "version": "1.0.0",
    "areas": [
      "admin",
      "dashboard"
    ],
    "mode": "tokens",
    "entryTokens": "tokens.css",
    "themeRange": "^1.0.0",
    "packDir": "themes/pilot-admin",
    "entryTokensPath": "themes/pilot-admin/tokens.css",
    "entryTemplatesPath": "themes/pilot-admin/templates.json",
    "entryAssetsPath": null,
    "themeCompatible": true,
    "codeTemplates": [
      {
        "componentId": "ui.table",
        "filePath": "themes/pilot-admin/templates/ui.table.tsx"
      }
    ],
    "hasThemeConfig": true,
    "themeConfigImportPath": "themes/pilot-admin/config",
    "hasFrontendRoutes": false,
    "frontendRoutesImportPath": null
  }
];
