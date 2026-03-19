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
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeBuildFormDefinition } from '@skitsaas/sdk';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { upsertProviderConfigBatchAction } from '../actions';
import { getAdminAppConfigData } from '../config';
import { createAdminProviderConfigBuildFormBase } from '../forms';

export default async function AdminAppConfigEmailPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const savingLabel = `${t('Save')}...`;

  const { emailRows } = await getAdminAppConfigData();
  const emailProvider = emailRows[0]?.provider || 'smtp';
  const themeSelection = await getThemeSelectionForArea('admin');
  const emailConfigForm = composeBuildFormDefinition(
    createAdminProviderConfigBuildFormBase({
      formId: 'admin-app-config-email-form',
      provider: emailProvider,
      rows: emailRows,
      copy: {
        envPrefix: t('ENV'),
        sourcePrefix: t('Value source'),
        overriddenByEnv: t('Overridden by env'),
        dbFallbackValue: t('DB fallback value')
      }
    }),
    {
      request: {
        action: upsertProviderConfigBatchAction,
        method: 'post'
      },
      submit: {
        idleLabel: t('Save'),
        pendingLabel: savingLabel,
        align: 'end',
        size: 'sm',
        variant: 'outline'
      }
    }
  );

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Email')}</CardTitle>
          <CardDescription>
            {t(
              'Configure external SMTP delivery and review outgoing notification logs.'
            )}
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
          <CardTitle>{t('SMTP Configuration')}</CardTitle>
          <CardDescription>
            {t('Use an external SMTP provider. Local SMTP hosts are blocked.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TemplateBuildForm
            definition={emailConfigForm}
            area="admin"
            route="/admin/app-config/email"
            slot="admin.app-config.email"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Email Delivery Logs')}</CardTitle>
          <CardDescription>
            {t(
              'Track each outgoing notification, recipient, trigger event, and delivery status.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/logs?tab=email">{t('Email')}</Link>
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
      id="page.admin.app-config.email"
      data={{
        title: t('Email'),
        description: t(
          'Configure external SMTP delivery and review outgoing notification logs.'
        ),
        provider: emailProvider
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
