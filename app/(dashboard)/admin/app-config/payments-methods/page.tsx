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
import { getAdminAppConfigData, PROVIDER_ORDER, type ProviderId } from '../config';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveProviderFilter(
  value: string | string[] | undefined
): ProviderId {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'paypal' ? 'paypal' : 'stripe';
}

export default async function AdminAppConfigPaymentMethodsPage({
  searchParams
}: PageProps) {
  const messages = await getServerMessages('admin');
  const appConfig = messages.appConfig;
  const savingLabel = `${appConfig.save}...`;
  const resolvedSearchParams = await searchParams;
  const { paymentRowsByProvider } = await getAdminAppConfigData();
  const selectedProvider = resolveProviderFilter(resolvedSearchParams.provider);
  const providerRows = paymentRowsByProvider[selectedProvider].filter(
    (row) => !row.configKey.startsWith('plan_id')
  );
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{appConfig.sections.paymentMethods}</CardTitle>
          <CardDescription>{appConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{appConfig.envPriority}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>{appConfig.providers[selectedProvider]}</CardTitle>
          <div className="inline-flex w-fit items-center rounded-xl border border-border/80 bg-background/70 p-1">
            {PROVIDER_ORDER.map((provider) => (
              <Button
                key={provider}
                asChild
                size="sm"
                variant={selectedProvider === provider ? 'default' : 'ghost'}
                className="rounded-lg"
              >
                <Link
                  href={
                    provider === 'stripe'
                      ? '/admin/app-config/payments-methods'
                      : `/admin/app-config/payments-methods?provider=${provider}`
                  }
                >
                  {appConfig.providers[provider]}
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form action={upsertProviderConfigBatchAction} className="space-y-3">
            <input type="hidden" name="provider" value={selectedProvider} />
            {providerRows.map((row) => (
              <div
                key={`${row.provider}:${row.configKey}`}
                className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {row.provider}.{row.configKey}
                </p>
                {row.configKey === 'enabled' ? (
                  <select
                    name={`configValues.${row.configKey}`}
                    defaultValue={row.dbValue || row.value || 'true'}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    name={`configValues.${row.configKey}`}
                    defaultValue={row.dbValue}
                    placeholder={
                      row.source === 'env'
                        ? appConfig.overriddenByEnv
                        : appConfig.dbFallbackValue
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {appConfig.envPrefix}: {row.envKey}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appConfig.sourcePrefix}: {row.source}
                </p>
              </div>
            ))}

            <div className="flex justify-end">
              <TemplateAsyncSubmitButton
                area="admin"
                route="/admin/app-config/payments-methods"
                size="sm"
                variant="outline"
                idleLabel={appConfig.save}
                pendingLabel={savingLabel}
              />
            </div>
          </form>
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
      id="page.admin.app-config.payment-methods"
      data={{
        title: appConfig.sections.paymentMethods,
        description: appConfig.description,
        provider: selectedProvider
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
