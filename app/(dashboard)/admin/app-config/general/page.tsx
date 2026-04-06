import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminAppConfigGeneralPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('General')}</CardTitle>
          <CardDescription>
            {t('Global runtime configuration shared between public pages and dashboard.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {t(
              'Environment values have priority. DB values are used only when env is empty.'
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Organization limits')}</CardTitle>
          <CardDescription>
            {t('Organization quotas are now controlled from subscription templates.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t(
              'Use subscription templates to define dashboard.user.organizations.max and other organization-related limits. This page no longer overrides those quotas with app config.'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.app-config.general"
      data={{
        title: t('General'),
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
