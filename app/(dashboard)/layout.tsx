import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { PrivateAreaHeader } from './private-area-header';

export default async function DashboardGroupLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [adminThemeSelection, dashboardThemeSelection] = await Promise.all([
    getThemeSelectionForArea('admin'),
    getThemeSelectionForArea('dashboard')
  ]);

  return (
    <section className="flex min-h-screen flex-col bg-transparent">
      <PrivateAreaHeader
        adminThemeId={adminThemeSelection.themeKey}
        dashboardThemeId={dashboardThemeSelection.themeKey}
      />
      {children}
    </section>
  );
}
