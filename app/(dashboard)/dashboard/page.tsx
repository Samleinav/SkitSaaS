import type { ComponentType } from 'react';
import { redirect } from 'next/navigation';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { requireAnyDashboardAccess } from '@/lib/auth/contexts';
import {
  getEnabledDashboardModuleWidgets,
  getEnabledStandaloneHomeComponent
} from '@/lib/modules/runtime';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import DashboardHomeCore from './home-core';
import DashboardHomeNoContext from './home-no-context';

type DashboardHomeModuleProps = {};

type DashboardHomeModuleDefinition = {
  id: string;
  Component: ComponentType<DashboardHomeModuleProps>;
};

const CORE_DASHBOARD_HOME_MODULES: DashboardHomeModuleDefinition[] = [
  {
    id: 'core.dashboard.home',
    Component: DashboardHomeCore
  }
];

export default async function DashboardHomePage() {
  const { context } = await requireAnyDashboardAccess();

  if (context.type === 'system_admin') {
    redirect('/admin');
  }

  if (context.type === 'standalone') {
    const StandaloneHome = await getEnabledStandaloneHomeComponent();
    if (StandaloneHome) {
      return <StandaloneHome userId={context.userId} />;
    }

    return <DashboardHomeNoContext />;
  }

  const widgets = await getEnabledDashboardModuleWidgets();
  const widgetModules: DashboardHomeModuleDefinition[] = widgets.map((widget) => ({
    id: widget.id,
    Component: widget.Component as ComponentType<DashboardHomeModuleProps>
  }));

  const modules = [...CORE_DASHBOARD_HOME_MODULES, ...widgetModules];

  const fallbackPage = (
    <>
      {modules.map((moduleItem) => (
        <moduleItem.Component key={moduleItem.id} />
      ))}
    </>
  );

  const themeSelection = await getThemeSelectionForArea('dashboard');
  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.dashboard.home"
      data={{
        title: 'Dashboard'
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
