import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getServerTranslator } from '@/lib/i18n/server';
import { areTeamsEnabled } from '@/lib/organizations/config';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function AdminAppConfigGeneralPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const teamsEnabled = areTeamsEnabled();
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('General')}</CardTitle>
          <CardDescription>
            {t('Shared runtime notes for the admin, dashboard, and public surfaces.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {t(
              'Environment values have priority. DB values are used only when env is empty.'
            )}
          </p>
          <p>
            {t(
              'Use the dedicated App Config sections to manage subscriptions, payment providers, email delivery, and modules.'
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Deployment mode')}</CardTitle>
          <CardDescription>
            {t('Quick environment overview for the current installation.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {teamsEnabled
              ? t(
                  'Current deployment mode: organizations are enabled and public sign-up provisions team-aware accounts.'
                )
              : t(
                  'Current deployment mode: standalone users only and public sign-up provisions user-scoped accounts.'
                )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Subscriptions')}</CardTitle>
          <CardDescription>
            {t(
              'Public signup defaults live in their own App Config section. Payment fallback is driven by default tiers per scope.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/app-config/subscriptions">
              {t('Open subscriptions config')}
            </Link>
          </Button>
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
          'Shared runtime notes for the admin, dashboard, and public surfaces.'
        )
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
