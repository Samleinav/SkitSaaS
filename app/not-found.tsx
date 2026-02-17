import { ThemeNotFoundFallback } from '@/components/theme/theme-not-found-fallback';
import { getServerMessages } from '@/lib/i18n/server';

export default async function NotFound() {
  const messages = await getServerMessages('global');
  const notFound = messages.notFound;

  return (
    <ThemeNotFoundFallback
      title={notFound.title}
      description={notFound.description}
      backLabel={notFound.backHome}
      backHref="/"
      switcherArea="global"
    />
  );
}
