import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';
import { PrivateAreaHeader } from './private-area-header';
import { PrivateAreaShell } from './private-area-shell';

export default async function DashboardGroupLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [adminThemeSelection, dashboardThemeSelection] = await Promise.all([
    getThemeSelectionForArea('admin'),
    getThemeSelectionForArea('dashboard')
  ]);
  const resolvedAppConfig = getResolvedAppConfig();

  const layoutContent = (
    <>
      <PrivateAreaHeader
        adminThemeId={adminThemeSelection.themeKey}
        dashboardThemeId={dashboardThemeSelection.themeKey}
        projectName={resolvedAppConfig.projectName}
      />
      {children}
    </>
  );

  return (
    <PrivateAreaShell
      adminThemeId={adminThemeSelection.themeKey}
      dashboardThemeId={dashboardThemeSelection.themeKey}
      projectName={resolvedAppConfig.projectName}
    >
      {layoutContent}
    </PrivateAreaShell>
  );
}
