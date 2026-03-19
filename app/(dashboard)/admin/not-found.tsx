import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  getExternalThemeNotFoundTemplateIdBySelectionFromConfig
} from '@/lib/themes/assets';

export default async function AdminNotFound() {
  const t = await getServerTranslator({ area: 'global' });
  const fallback = (
    <ThemeNotFoundFallback
      title={t('Page Not Found')}
      description={t(
        'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'
      )}
      backLabel={t('Back to Home')}
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
        title: t('Page Not Found'),
        message: t(
          'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'
        )
      }}
      fallback={fallback}
    />
  );
}
