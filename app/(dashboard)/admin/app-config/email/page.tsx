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
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { upsertProviderConfigBatchAction } from '../actions';
import { getAdminAppConfigData } from '../config';

export default async function AdminAppConfigEmailPage() {
  const messages = await getServerMessages('admin');
  const appConfig = messages.appConfig;
  const emailMessages = appConfig.email;
  const savingLabel = `${appConfig.save}...`;

  const { emailRows } = await getAdminAppConfigData();
  const emailProvider = emailRows[0]?.provider || 'smtp';
  const themeSelection = await getThemeSelectionForArea('admin');

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
          <form action={upsertProviderConfigBatchAction} className="space-y-3">
            <input type="hidden" name="provider" value={emailProvider} />
            {emailRows.map((row) => (
              <div
                key={`${row.provider}:${row.configKey}`}
                className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {row.provider}.{row.configKey}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appConfig.envPrefix}: {row.envKey}
                </p>
                <input
                  name={`configValues.${row.configKey}`}
                  type={row.configKey.includes('password') ? 'password' : 'text'}
                  defaultValue={row.dbValue}
                  placeholder={
                    row.source === 'env'
                      ? appConfig.overriddenByEnv
                      : appConfig.dbFallbackValue
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {appConfig.sourcePrefix}: {row.source}
                </p>
              </div>
            ))}
            <div className="flex justify-end">
              <TemplateAsyncSubmitButton
                area="admin"
                route="/admin/app-config/email"
                size="sm"
                variant="outline"
                idleLabel={appConfig.save}
                pendingLabel={savingLabel}
              />
            </div>
          </form>
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
