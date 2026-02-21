import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import SecurityPageClient from './security-page-client';

export default async function SecurityPage() {
  const messages = await getServerMessages('dashboard');
  const themeSelection = await getThemeSelectionForArea('dashboard');
  const fallbackPage = <SecurityPageClient />;

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.dashboard.security"
      data={{
        title: messages.security.title,
        description: messages.security.passwordTitle
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
