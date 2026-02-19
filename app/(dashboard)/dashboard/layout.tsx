import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DashboardLayoutClient from './layout-client';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeGlobalStyle } from '@/components/theme/theme-global-style';
import { getEnabledModuleNavItems } from '@/lib/modules/runtime';
import { ThemeTokensStyle } from '@/components/theme/theme-tokens-style';
import { ThemeRuntimeProvider } from '@/components/theme/theme-runtime-provider';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  DASHBOARD_LAYOUT_STYLE,
  PRIVATE_LAYOUT_MODE
} from '@/lib/layout/private-area';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  readExternalThemeGlobalCssBySelectionFromConfig
} from '@/lib/themes/assets';
import { getExternalThemeTokensCssBySelection } from '@/lib/themes/runtime';
import { emitEvent } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { isDashboardEnabled } from '@/lib/config/runtime-surface';

export async function generateMetadata(): Promise<Metadata> {
  if (!isDashboardEnabled()) {
    return {};
  }

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
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

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (!isDashboardEnabled()) {
    notFound();
  }

  const moduleItems = await getEnabledModuleNavItems('dashboard');
  const navPayload = { items: [...moduleItems] };
  await emitEvent(
    EVENT_HOOKS.dashboardNavItemsCompose,
    navPayload,
    { source: '/dashboard/layout' }
  );
  const themeSelection = await getThemeSelectionForArea('dashboard');
  const themeTokensCss = getExternalThemeTokensCssBySelection({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });
  const themeGlobalCss = await readExternalThemeGlobalCssBySelectionFromConfig({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });

  const layoutContent = (
    <DashboardLayoutClient
      moduleItems={navPayload.items}
    >
      {children}
    </DashboardLayoutClient>
  );
  const themedLayoutContent = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="layout.dashboard.shell"
      themeId={themeSelection.themeKey}
      data={{
        heading: 'Dashboard',
        layoutStyle: DASHBOARD_LAYOUT_STYLE,
        mode: PRIVATE_LAYOUT_MODE,
        contentSlot: layoutContent
      }}
      fallback={layoutContent}
    >
      {layoutContent}
    </ThemeCodeTemplate>
  ) : (
    layoutContent
  );

  return (
    <ThemeRuntimeProvider
      area="dashboard"
      initialMode={themeSelection.mode}
      initialThemeKey={themeSelection.themeKey}
      initialTokensCss={themeTokensCss}
      allowUserOverride={themeSelection.allowUserOverride}
    >
      {themeTokensCss ? (
        <ThemeTokensStyle
          area="dashboard"
          themeKey={themeSelection.themeKey}
          tokensCss={themeTokensCss}
        />
      ) : null}
      {themeGlobalCss ? (
        <ThemeGlobalStyle
          area="dashboard"
          themeKey={themeSelection.themeKey}
          globalCss={themeGlobalCss}
        />
      ) : null}
      {themedLayoutContent}
    </ThemeRuntimeProvider>
  );
}
