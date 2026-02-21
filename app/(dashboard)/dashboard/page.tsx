import type { ComponentType } from 'react';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getEnabledDashboardModuleWidgets } from '@/lib/modules/runtime';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import DashboardHomeCore from './home-core';

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
