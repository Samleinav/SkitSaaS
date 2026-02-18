import { getThemeSelectionForArea } from '@/lib/theme-runtime';
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

  const layoutContent = (
    <>
      <PrivateAreaHeader
        adminThemeId={adminThemeSelection.themeKey}
        dashboardThemeId={dashboardThemeSelection.themeKey}
      />
      {children}
    </>
  );

  return (
    <PrivateAreaShell
      adminThemeId={adminThemeSelection.themeKey}
      dashboardThemeId={dashboardThemeSelection.themeKey}
    >
      {layoutContent}
    </PrivateAreaShell>
  );
}
