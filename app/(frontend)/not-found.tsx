import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function FrontendNotFound() {
  const t = await getServerTranslator({ area: 'global' });
  const fallback = (
    <ThemeNotFoundFallback
      title={t('Page Not Found')}
      description={t(
        'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.'
      )}
      backLabel={t('Back to Home')}
      backHref="/"
      switcherArea="global"
    />
  );

  const themeSelection = await getThemeSelectionForArea('frontend');
  const themeId = themeSelection.themeKey;
  if (!themeId) {
    return fallback;
  }

  return (
    <ThemeFrontendRoute
      path="/404"
      themeId={themeId}
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
