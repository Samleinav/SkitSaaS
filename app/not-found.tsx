import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerTranslator } from '@/lib/i18n/server';

export default async function NotFound() {
  const t = await getServerTranslator({ area: 'global' });

  return (
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
}
