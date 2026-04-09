export type BackofficeTemplateArea = 'admin' | 'dashboard';

export const BACKOFFICE_BASELINE_THEME_ID = 'theme.first.backoffice';

const ADMIN_REQUIRED_CODE_TEMPLATE_IDS = [
  'layout.private.shell',
  'layout.private.header',
  'layout.admin.shell',
  'layout.admin.app-config.shell',
  'page.admin.home',
  'page.admin.logs',
  'page.admin.users',
  'page.admin.user.detail',
  'page.admin.orders',
  'page.admin.orders.create',
  'page.admin.orders.edit',
  'page.admin.payments',
  'page.admin.suscriptions',
  'page.admin.suscriptions.user.edit',
  'page.admin.suscriptions.organization.edit',
  'page.admin.subscriptions.templates',
  'page.admin.subscriptions.create',
  'page.admin.subscriptions.edit',
  'page.admin.app-config.home',
  'page.admin.app-config.general',
  'page.admin.app-config.subscriptions',
  'page.admin.app-config.payment-methods',
  'page.admin.app-config.email',
  'page.admin.app-config.modules',
  'page.admin.app-config.theme',
  'section.admin.nav',
  'section.admin.breadcrumb',
  'section.admin.app-config-nav',
  'section.admin.app-config-nav.panel',
  'section.admin.app-config-nav.item',
  'section.admin.dashboard.overview',
  'section.admin.dashboard.quick-links',
  'section.admin.dashboard.recent-activity',
  'section.admin.dashboard.module-widget',
  'section.admin.table.users.cell',
  'section.admin.table.orders.cell',
  'section.admin.table.subscriptions.cell',
  'section.admin.table.subscriptions.templates.cell',
  'section.admin.table.payments.cell',
  'section.admin.table.logs.cell',
  'section.admin.table.suscriptions.user.cell',
  'section.admin.metrics-grid',
  'ui.dialog',
  'ui.alert-dialog',
  'ui.async-submit-button',
  'ui.theme-toggle',
  'ui.language-switcher',
  'ui.user-menu',
  'ui.table.control',
  'page.login.admin',
  'system.not-found',
  'ui.table'
] as const;

const DASHBOARD_REQUIRED_CODE_TEMPLATE_IDS = [
  'layout.private.shell',
  'layout.private.header',
  'layout.dashboard.shell',
  'page.dashboard.home',
  'page.dashboard.general',
  'page.dashboard.activity',
  'page.dashboard.activity.loading',
  'page.dashboard.security',
  'page.dashboard.subscriptions',
  'section.dashboard.table.subscriptions.organizations.cell',
  'section.dashboard.table.subscriptions.payments.cell',
  'section.dashboard.table.subscriptions.invoices.cell',
  'ui.alert-dialog',
  'ui.async-submit-button',
  'ui.theme-toggle',
  'ui.language-switcher',
  'ui.user-menu',
  'ui.table.control',
  'page.login.user',
  'page.login.signup',
  'system.not-found',
  'ui.table'
] as const;

export const BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA: Record<
  BackofficeTemplateArea,
  readonly string[]
> = {
  admin: ADMIN_REQUIRED_CODE_TEMPLATE_IDS,
  dashboard: DASHBOARD_REQUIRED_CODE_TEMPLATE_IDS
};

export const BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS = Array.from(
  new Set(
    Object.values(BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA).flat()
  )
).sort();
