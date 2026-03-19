import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminAppConfigPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader>
        <CardTitle>{t('App Config')}</CardTitle>
        <CardDescription>
          {t('Global runtime configuration shared between public pages and dashboard.')}
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {t('Environment values have priority. DB values are used only when env is empty.')}
        </p>
      </CardHeader>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.app-config.home"
      data={{
        title: t('App Config'),
        description: t(
          'Global runtime configuration shared between public pages and dashboard.'
        )
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
