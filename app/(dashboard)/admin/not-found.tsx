import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeNotFoundTemplateIdBySelectionFromConfig
} from '@/lib/themes/assets';

export default async function AdminNotFound() {
  const messages = await getServerMessages('global');
  const notFound = messages.notFound;
  const fallback = (
    <ThemeNotFoundFallback
      title={notFound.title}
      description={notFound.description}
      backLabel={notFound.backHome}
      backHref="/admin"
      switcherArea="admin"
    />
  );

  const themeSelection = await getThemeSelectionForArea('admin');
  const themeId = themeSelection.themeKey;
  if (!themeId) {
    return fallback;
  }

  const templateId =
    (await getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
      themeId,
      area: 'admin'
    })) ?? 'system.not-found';

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id={templateId}
      data={{
        title: notFound.title,
        message: notFound.description
      }}
      fallback={fallback}
    />
  );
}
