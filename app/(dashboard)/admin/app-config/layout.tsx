import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { AppConfigSectionNav } from './section-nav';

export default async function AdminAppConfigLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess();
  const themeSelection = await getThemeSelectionForArea('admin');
  const navFallback = <AppConfigSectionNav />;
  const navSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.app-config-nav"
      data={{
        section: 'app-config'
      }}
      fallback={navFallback}
    >
      {navFallback}
    </ThemeCodeTemplate>
  ) : (
    navFallback
  );

  const fallbackLayout = (
    <div className="space-y-6">
      {navSlot}
      {children}
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackLayout;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="layout.admin.app-config.shell"
      data={{
        section: 'app-config'
      }}
      fallback={fallbackLayout}
    >
      {fallbackLayout}
    </ThemeCodeTemplate>
  );
}
