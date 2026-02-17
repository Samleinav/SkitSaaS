import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeNotFoundTemplateIdBySelectionFromConfig
} from '@/lib/themes/assets';

export default async function DashboardNotFound() {
  const messages = await getServerMessages('global');
  const notFound = messages.notFound;
  const fallback = (
    <ThemeNotFoundFallback
      title={notFound.title}
      description={notFound.description}
      backLabel={notFound.backHome}
      backHref="/dashboard"
      switcherArea="dashboard"
    />
  );

  const themeSelection = await getThemeSelectionForArea('dashboard');
  const themeId = themeSelection.themeKey;
  if (!themeId) {
    return fallback;
  }

  const templateId =
    (await getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
      themeId,
      area: 'dashboard'
    })) ?? 'system.not-found';

  return (
    <ThemeCodeTemplate
      id={templateId}
      themeId={themeId}
      data={{
        title: notFound.title,
        message: notFound.description
      }}
      fallback={fallback}
    />
  );
}
