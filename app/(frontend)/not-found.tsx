import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function FrontendNotFound() {
  const messages = await getServerMessages('global');
  const notFound = messages.notFound;
  const fallback = (
    <ThemeNotFoundFallback
      title={notFound.title}
      description={notFound.description}
      backLabel={notFound.backHome}
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
        title: notFound.title,
        message: notFound.description
      }}
      fallback={fallback}
    />
  );
}
