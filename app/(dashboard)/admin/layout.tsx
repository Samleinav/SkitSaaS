import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeAreaAssets } from '@/components/theme/theme-area-assets';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeCodeRuntimeProvider } from '@/components/theme/theme-code-runtime-context';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ThemeRuntimeProvider } from '@/components/theme/theme-runtime-provider';
import { getServerTranslator } from '@/lib/i18n/server';
import {
  ADMIN_LAYOUT_STYLE,
  PRIVATE_LAYOUT_MODE
} from '@/lib/layout/private-area';
import { cn } from '@/lib/utils';
import { getEnabledModuleNavItems } from '@/lib/modules/runtime';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  resolveAreaAssetHrefsBySelection
} from '@/lib/themes/assets';
import type { AdminNavTemplateItem } from '@/lib/themes/template-data-contract';
import { emitEvent } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { isAdminEnabled } from '@/lib/config/runtime-surface';
import { createPerfTrace } from '@/lib/observability/perf-trace';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';
import { AdminBreadcrumb, type AdminNavLabels } from './admin-breadcrumb';
import { AdminNav } from './admin-nav';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export async function generateMetadata(): Promise<Metadata> {
  const perfTrace = createPerfTrace({
    scope: 'admin',
    name: 'admin.layout.metadata',
    tags: {
      route: '/admin'
    }
  });

  try {
    if (!isAdminEnabled()) {
      perfTrace.end('skipped', {
        reason: 'admin_disabled'
      });
      return {};
    }

    const themeSelection = await getThemeSelectionForArea('admin');
    perfTrace.step('getThemeSelectionForArea', {
      themeId: themeSelection.themeKey
    });

    const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
      themeId: themeSelection.themeKey,
      area: 'admin'
    });
    perfTrace.step('getExternalThemeFaviconDataUrlBySelectionFromConfig', {
      hasFavicon: Boolean(favicon)
    });

    if (!favicon) {
      perfTrace.end('ok', {
        hasIcons: false
      });
      return {};
    }

    perfTrace.end('ok', {
      hasIcons: true
    });
    return {
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon
      }
    };
  } catch (error) {
    perfTrace.end('error', {
      errorName: error instanceof Error ? error.name : 'unknown_error'
    });
    throw error;
  }
}

export default async function AdminLayout({
  children
}: AdminLayoutProps) {
  const perfTrace = createPerfTrace({
    scope: 'admin',
    name: 'admin.layout',
    tags: {
      route: '/admin'
    }
  });

  try {
    if (!isAdminEnabled()) {
      perfTrace.end('skipped', {
        reason: 'admin_disabled'
      });
      notFound();
    }

    const t = await getServerTranslator({ area: 'admin' });
    perfTrace.step('getServerTranslator');
    const moduleItems = await getEnabledModuleNavItems('admin');
    const navPayload = { items: [...moduleItems] };
    perfTrace.step('getEnabledModuleNavItems', {
      moduleItems: moduleItems.length
    });
    await emitEvent(
      EVENT_HOOKS.adminNavItemsCompose,
      navPayload,
      { source: '/admin/layout' }
    );
    perfTrace.step('emitEvent:adminNavItemsCompose');
    const themeSelection = await getThemeSelectionForArea('admin');
    const resolvedAppConfig = getResolvedAppConfig();
    perfTrace.step('getThemeSelectionForArea', {
      themeId: themeSelection.themeKey
    });
    const areaAssets = resolveAreaAssetHrefsBySelection({
      themeId: themeSelection.themeKey,
      area: 'admin'
    });
    perfTrace.step('resolveAreaAssetHrefsBySelection', {
      cssHrefs: areaAssets.cssHrefs.length,
      scriptHrefs: areaAssets.scriptHrefs.length
    });
    const navLabels: AdminNavLabels = {
      users: t('Users'),
      subscriptions: t('Subscriptions'),
      payments: t('Payments'),
      orders: t('Orders'),
      logs: t('Logs'),
      appConfig: t('App Config')
    };
    const navVariant = ADMIN_LAYOUT_STYLE === 'layout_basic' ? 'basic' : 'pro';
    const isAdjusted = PRIVATE_LAYOUT_MODE === 'adjusted';
    const coreNavItemsForTemplate: AdminNavTemplateItem[] = [
      {
        href: '/admin',
        icon: 'layout-dashboard',
        label: t('Admin'),
        exact: true
      },
      {
        href: '/admin/users',
        icon: 'users',
        label: t('Users')
      },
      {
        href: '/admin/subscriptions',
        icon: 'layout-template',
        label: t('Subscriptions'),
        matchPrefixes: ['/admin/subscriptions', '/admin/suscriptions'],
        children: [
          {
            href: '/admin/subscriptions',
            label: t('Subscriptions')
          },
          {
            href: '/admin/subscriptions/templates',
            label: t('Subscription Templates')
          }
        ]
      },
      {
        href: '/admin/payments',
        icon: 'receipt-text',
        label: t('Payments')
      },
      {
        href: '/admin/orders',
        icon: 'shopping-cart',
        label: t('Orders')
      },
      {
        href: '/admin/logs',
        icon: 'file-text',
        label: t('Logs')
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
      label: t('App Config')
    };
    const accountNavItemForTemplate: AdminNavTemplateItem = {
      href: '/admin/account',
      icon: 'user-round',
      label: t('Account')
    };
    const navItemsForTemplate: AdminNavTemplateItem[] = [
      ...coreNavItemsForTemplate,
      ...moduleNavItemsForTemplate,
      accountNavItemForTemplate,
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
        themeId={themeSelection.themeKey}
        id="section.admin.nav"
        data={{
          variant: navVariant,
          mode: PRIVATE_LAYOUT_MODE,
          moduleItemsCount: navPayload.items.length,
          navItems: navItemsForTemplate,
          projectName: resolvedAppConfig.projectName
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
        title={t('Admin')}
        labels={navLabels}
        backToAppConfigLabel={t('Back App Config')}
      />
    );
    const breadcrumbSlot = themeSelection?.themeKey ? (
      <ThemeCodeTemplate
        themeId={themeSelection.themeKey}
        id="section.admin.breadcrumb"
        data={{
          title: t('Admin'),
          backToAppConfigLabel: t('Back App Config')
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
        themeId={themeSelection.themeKey}
        id="ui.theme-toggle"
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
        themeId={themeSelection.themeKey}
        id="ui.language-switcher"
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
        themeId={themeSelection.themeKey}
        id="ui.theme-toggle"
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
        themeId={themeSelection.themeKey}
        id="ui.language-switcher"
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
            isAdjusted
              ? 'gap-8 xl:grid-cols-[320px_1fr]'
              : 'gap-6 xl:grid-cols-[300px_1fr]'
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
        themeId={themeSelection.themeKey}
        id="layout.admin.shell"
        data={{
          heading: t('Admin'),
          variant: navVariant,
          mode: PRIVATE_LAYOUT_MODE,
          projectName: resolvedAppConfig.projectName,
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

    perfTrace.step('composeAdminLayoutSlots', {
      navVariant,
      moduleItems: navPayload.items.length
    });
    perfTrace.end('ok', {
      themeId: themeSelection.themeKey,
      wrappedByThemeCodeTemplate: Boolean(themeSelection?.themeKey)
    });

    return (
      <ThemeCodeRuntimeProvider themeId={themeSelection.themeKey}>
        <ThemeRuntimeProvider
          area="admin"
          initialMode={themeSelection.mode}
          initialThemeKey={themeSelection.themeKey}
          initialTokensCss={null}
          allowUserOverride={themeSelection.allowUserOverride}
        >
          <ThemeAreaAssets
            area="admin"
            themeId={themeSelection.themeKey}
            cssHrefs={areaAssets.cssHrefs}
            scriptHrefs={areaAssets.scriptHrefs}
          />
          {themedLayoutContent}
        </ThemeRuntimeProvider>
      </ThemeCodeRuntimeProvider>
    );
  } catch (error) {
    perfTrace.end('error', {
      errorName: error instanceof Error ? error.name : 'unknown_error'
    });
    throw error;
  }
}
