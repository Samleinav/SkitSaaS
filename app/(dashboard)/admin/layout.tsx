import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeGlobalStyle } from '@/components/theme/theme-global-style';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ThemeTokensStyle } from '@/components/theme/theme-tokens-style';
import { ThemeRuntimeProvider } from '@/components/theme/theme-runtime-provider';
import { getServerMessages } from '@/lib/i18n/server';
import {
  ADMIN_LAYOUT_STYLE,
  PRIVATE_LAYOUT_MODE
} from '@/lib/layout/private-area';
import { cn } from '@/lib/utils';
import { getEnabledModuleNavItems } from '@/lib/modules/runtime';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  readExternalThemeGlobalCssBySelectionFromConfig
} from '@/lib/themes/assets';
import type { AdminNavTemplateItem } from '@/lib/themes/template-data-contract';
import { getExternalThemeTokensCssBySelection } from '@/lib/themes/runtime';
import { emitEvent } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { isAdminEnabled } from '@/lib/config/runtime-surface';
import { AdminBreadcrumb, type AdminNavLabels } from './admin-breadcrumb';
import { AdminNav } from './admin-nav';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export async function generateMetadata(): Promise<Metadata> {
  if (!isAdminEnabled()) {
    return {};
  }

  const themeSelection = await getThemeSelectionForArea('admin');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'admin'
  });
  if (!favicon) {
    return {};
  }

  return {
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon
    }
  };
}

export default async function AdminLayout({
  children
}: AdminLayoutProps) {
  if (!isAdminEnabled()) {
    notFound();
  }

  const messages = await getServerMessages('admin');
  const moduleItems = await getEnabledModuleNavItems('admin');
  const navPayload = { items: [...moduleItems] };
  await emitEvent(
    EVENT_HOOKS.adminNavItemsCompose,
    navPayload,
    { source: '/admin/layout' }
  );
  const themeSelection = await getThemeSelectionForArea('admin');
  const themeTokensCss = getExternalThemeTokensCssBySelection({
    themeId: themeSelection.themeKey,
    area: 'admin'
  });
  const themeGlobalCss = await readExternalThemeGlobalCssBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'admin'
  });
  const navLabels: AdminNavLabels = {
    users: messages.nav.users,
    subscriptions: messages.nav.subscriptions,
    payments: messages.nav.payments,
    orders: messages.nav.orders,
    logs: messages.nav.logs,
    appConfig: messages.nav.appConfig
  };
  const navVariant = ADMIN_LAYOUT_STYLE === 'layout_basic' ? 'basic' : 'pro';
  const isAdjusted = PRIVATE_LAYOUT_MODE === 'adjusted';
  const coreNavItemsForTemplate: AdminNavTemplateItem[] = [
    {
      href: '/admin',
      icon: 'layout-dashboard',
      label: messages.layout.title,
      exact: true
    },
    {
      href: '/admin/users',
      icon: 'users',
      label: messages.nav.users
    },
    {
      href: '/admin/suscriptions',
      icon: 'layout-template',
      label: messages.nav.subscriptions,
      matchPrefixes: ['/admin/subscriptions'],
      children: [
        {
          href: '/admin/suscriptions',
          label: messages.subscriptionsPage.subscriptionsTitle
        },
        {
          href: '/admin/subscriptions',
          label: messages.subscriptionsPage.templatesTitle
        }
      ]
    },
    {
      href: '/admin/payments',
      icon: 'receipt-text',
      label: messages.nav.payments
    },
    {
      href: '/admin/orders',
      icon: 'shopping-cart',
      label: messages.nav.orders
    },
    {
      href: '/admin/logs',
      icon: 'file-text',
      label: messages.nav.logs
    }
  ];
  const moduleNavItemsForTemplate: AdminNavTemplateItem[] = navPayload.items.map(
    (item) => ({
      href: item.href,
      icon: 'package',
      label: item.label,
      exact: item.exact
    })
  );
  const appConfigNavItemForTemplate: AdminNavTemplateItem = {
    href: '/admin/app-config',
    icon: 'settings-2',
    label: messages.nav.appConfig
  };
  const navItemsForTemplate: AdminNavTemplateItem[] = [
    ...coreNavItemsForTemplate,
    ...moduleNavItemsForTemplate,
    appConfigNavItemForTemplate
  ];
  const navFallback = (
    <AdminNav
      variant={navVariant}
      mode={PRIVATE_LAYOUT_MODE}
      moduleItems={navPayload.items}
    />
  );
  const navSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="section.admin.nav"
      themeId={themeSelection.themeKey}
      data={{
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE,
        moduleItemsCount: navPayload.items.length,
        navItems: navItemsForTemplate
      }}
      fallback={navFallback}
    >
      {navFallback}
    </ThemeCodeTemplate>
  ) : (
    navFallback
  );
  const breadcrumbFallback = (
    <AdminBreadcrumb
      title={messages.layout.title}
      labels={navLabels}
      backToAppConfigLabel={messages.appConfig.backToAppConfig}
    />
  );
  const breadcrumbSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="section.admin.breadcrumb"
      themeId={themeSelection.themeKey}
      data={{
        title: messages.layout.title,
        backToAppConfigLabel: messages.appConfig.backToAppConfig
      }}
      fallback={breadcrumbFallback}
    >
      {breadcrumbFallback}
    </ThemeCodeTemplate>
  ) : (
    breadcrumbFallback
  );
  const basicThemeToggleFallback = <ThemeToggle className="justify-between" />;
  const basicThemeToggle = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="ui.theme-toggle"
      themeId={themeSelection.themeKey}
      data={{
        area: 'admin',
        slot: 'controls.basic',
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE
      }}
      fallback={basicThemeToggleFallback}
    >
      {basicThemeToggleFallback}
    </ThemeCodeTemplate>
  ) : (
    basicThemeToggleFallback
  );
  const basicLanguageSwitcherFallback = (
    <LanguageSwitcher
      area="admin"
      triggerClassName="w-full justify-between rounded-full"
    />
  );
  const basicLanguageSwitcher = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="ui.language-switcher"
      themeId={themeSelection.themeKey}
      data={{
        area: 'admin',
        slot: 'controls.basic',
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE
      }}
      fallback={basicLanguageSwitcherFallback}
    >
      {basicLanguageSwitcherFallback}
    </ThemeCodeTemplate>
  ) : (
    basicLanguageSwitcherFallback
  );
  const proThemeToggleFallback = (
    <ThemeToggle
      className="w-full justify-between border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800 hover:text-white"
    />
  );
  const proThemeToggle = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="ui.theme-toggle"
      themeId={themeSelection.themeKey}
      data={{
        area: 'admin',
        slot: 'controls.pro',
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE
      }}
      fallback={proThemeToggleFallback}
    >
      {proThemeToggleFallback}
    </ThemeCodeTemplate>
  ) : (
    proThemeToggleFallback
  );
  const proLanguageSwitcherFallback = (
    <LanguageSwitcher
      area="admin"
      triggerClassName="w-full justify-between rounded-full border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800 hover:text-white"
    />
  );
  const proLanguageSwitcher = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="ui.language-switcher"
      themeId={themeSelection.themeKey}
      data={{
        area: 'admin',
        slot: 'controls.pro',
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE
      }}
      fallback={proLanguageSwitcherFallback}
    >
      {proLanguageSwitcherFallback}
    </ThemeCodeTemplate>
  ) : (
    proLanguageSwitcherFallback
  );
  const controlsSlot =
    navVariant === 'basic' ? (
      <div className="grid gap-2 rounded-2xl border border-border/70 bg-card/80 p-3">
        {basicThemeToggle}
        {basicLanguageSwitcher}
      </div>
    ) : (
      <div className="grid gap-2">
        {proThemeToggle}
        {proLanguageSwitcher}
      </div>
    );

  const layoutFallback = (
    <section
      className={cn(
        'mx-auto w-full flex-1',
        isAdjusted
          ? 'max-w-[94rem] px-5 py-7 sm:px-7 lg:px-8 lg:py-9'
          : 'max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
      )}
    >
      <div
        className={cn(
          'grid',
          isAdjusted ? 'gap-8 xl:grid-cols-[320px_1fr]' : 'gap-6 xl:grid-cols-[300px_1fr]'
        )}
      >
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          {navSlot}
          {controlsSlot}
        </aside>
        <main className={cn('min-w-0', isAdjusted ? 'space-y-8' : 'space-y-6')}>
          {breadcrumbSlot}
          {children}
        </main>
      </div>
    </section>
  );

  const themedLayoutContent = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="layout.admin.shell"
      themeId={themeSelection.themeKey}
      data={{
        heading: messages.layout.title,
        variant: navVariant,
        mode: PRIVATE_LAYOUT_MODE,
        navSlot,
        breadcrumbSlot,
        controlsSlot,
        contentSlot: children
      }}
      fallback={layoutFallback}
    >
      {layoutFallback}
    </ThemeCodeTemplate>
  ) : (
    layoutFallback
  );

  return (
    <ThemeRuntimeProvider
      area="admin"
      initialMode={themeSelection.mode}
      initialThemeKey={themeSelection.themeKey}
      initialTokensCss={themeTokensCss}
      allowUserOverride={themeSelection.allowUserOverride}
    >
      {themeTokensCss ? (
        <ThemeTokensStyle
          area="admin"
          themeKey={themeSelection.themeKey}
          tokensCss={themeTokensCss}
        />
      ) : null}
      {themeGlobalCss ? (
        <ThemeGlobalStyle
          area="admin"
          themeKey={themeSelection.themeKey}
          globalCss={themeGlobalCss}
        />
      ) : null}
      {themedLayoutContent}
    </ThemeRuntimeProvider>
  );
}
