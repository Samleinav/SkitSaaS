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
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { upsertProviderConfigBatchAction } from '../actions';
import { getAdminAppConfigData } from '../config';
import { createAdminProviderConfigBuildFormBase } from '../forms';

export default async function AdminAppConfigEmailPage() {
  const messages = await getServerMessages('admin');
  const appConfig = messages.appConfig;
  const emailMessages = appConfig.email;
  const savingLabel = `${appConfig.save}...`;

  const { emailRows } = await getAdminAppConfigData();
  const emailProvider = emailRows[0]?.provider || 'smtp';
  const themeSelection = await getThemeSelectionForArea('admin');
  const emailConfigForm = composeBuildFormDefinition(
    createAdminProviderConfigBuildFormBase({
      formId: 'admin-app-config-email-form',
      provider: emailProvider,
      rows: emailRows,
      copy: {
        envPrefix: appConfig.envPrefix,
        sourcePrefix: appConfig.sourcePrefix,
        overriddenByEnv: appConfig.overriddenByEnv,
        dbFallbackValue: appConfig.dbFallbackValue
      }
    }),
    {
      request: {
        action: upsertProviderConfigBatchAction,
        method: 'post'
      },
      submit: {
        idleLabel: appConfig.save,
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
          <CardTitle>{appConfig.sections.email}</CardTitle>
          <CardDescription>{emailMessages.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{appConfig.envPriority}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{emailMessages.smtpConfigTitle}</CardTitle>
          <CardDescription>{emailMessages.smtpConfigDescription}</CardDescription>
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
          <CardTitle>{emailMessages.logsTitle}</CardTitle>
          <CardDescription>{emailMessages.logsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/logs?tab=email">{messages.logsPage.tabs.email}</Link>
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
        title: appConfig.sections.email,
        description: emailMessages.description,
        provider: emailProvider
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
