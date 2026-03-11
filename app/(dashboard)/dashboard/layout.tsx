import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import DashboardLayoutClient from './layout-client';
import { ThemeAreaAssets } from '@/components/theme/theme-area-assets';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeCodeRuntimeProvider } from '@/components/theme/theme-code-runtime-context';
import { requireAnyDashboardAccess } from '@/lib/auth/contexts';
import {
  getEnabledModuleNavItems,
  getEnabledStandaloneNavItems
} from '@/lib/modules/runtime';
import { ThemeRuntimeProvider } from '@/components/theme/theme-runtime-provider';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  DASHBOARD_LAYOUT_STYLE,
  PRIVATE_LAYOUT_MODE
} from '@/lib/layout/private-area';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  resolveAreaAssetHrefsBySelection
} from '@/lib/themes/assets';
import { emitEvent } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import { isDashboardEnabled } from '@/lib/config/runtime-surface';
import { resolveDashboardNavItemsForContext } from './nav-context';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';

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

  const { context } = await requireAnyDashboardAccess();
  if (context.type === 'system_admin') {
    redirect('/admin');
  }

  let teamMemberItems: Awaited<ReturnType<typeof getEnabledModuleNavItems>> = [];
  if (context.type === 'team_member') {
    teamMemberItems = await getEnabledModuleNavItems('dashboard');
    const navPayload = { items: [...teamMemberItems] };
    await emitEvent(
      EVENT_HOOKS.dashboardNavItemsCompose,
      navPayload,
      { source: '/dashboard/layout' }
    );
    teamMemberItems = navPayload.items;
  }

  const standaloneItems =
    context.type === 'standalone'
      ? await getEnabledStandaloneNavItems(context.userId)
      : [];

  const moduleItems = resolveDashboardNavItemsForContext({
    contextType: context.type,
    teamMemberItems,
    standaloneItems
  });

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const resolvedAppConfig = getResolvedAppConfig();
  const areaAssets = resolveAreaAssetHrefsBySelection({
    themeId: themeSelection.themeKey,
    area: 'dashboard'
  });

  const layoutContent = (
    <DashboardLayoutClient contextType={context.type} moduleItems={moduleItems}>
      {children}
    </DashboardLayoutClient>
  );
  const themedLayoutContent = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="layout.dashboard.shell"
      data={{
        heading: 'Dashboard',
        layoutStyle: DASHBOARD_LAYOUT_STYLE,
        mode: PRIVATE_LAYOUT_MODE,
        projectName: resolvedAppConfig.projectName,
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
    <ThemeCodeRuntimeProvider themeId={themeSelection.themeKey}>
      <ThemeRuntimeProvider
        area="dashboard"
        initialMode={themeSelection.mode}
        initialThemeKey={themeSelection.themeKey}
        initialTokensCss={null}
        allowUserOverride={themeSelection.allowUserOverride}
      >
        <ThemeAreaAssets
          area="dashboard"
          themeId={themeSelection.themeKey}
          cssHrefs={areaAssets.cssHrefs}
          scriptHrefs={areaAssets.scriptHrefs}
        />
        {themedLayoutContent}
      </ThemeRuntimeProvider>
    </ThemeCodeRuntimeProvider>
  );
}
