import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import GeneralPageClient from './general-page-client';

export default async function GeneralPage() {
  const messages = await getServerMessages('dashboard');
  const themeSelection = await getThemeSelectionForArea('dashboard');
  const fallbackPage = <GeneralPageClient />;

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.dashboard.general"
      themeId={themeSelection.themeKey}
      data={{
        title: messages.general.title,
        description: messages.general.accountInformation
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
