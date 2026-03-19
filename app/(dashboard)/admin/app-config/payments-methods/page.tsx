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
import { getAdminAppConfigData, PROVIDER_ORDER, type ProviderId } from '../config';
import { createAdminProviderConfigBuildFormBase } from '../forms';

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
  const t = await getServerTranslator({ area: 'admin' });
  const savingLabel = `${t('Save')}...`;
  const resolvedSearchParams = await searchParams;
  const { paymentRowsByProvider } = await getAdminAppConfigData();
  const selectedProvider = resolveProviderFilter(resolvedSearchParams.provider);
  const providerRows = paymentRowsByProvider[selectedProvider].filter(
    (row) => !row.configKey.startsWith('plan_id')
  );
  const themeSelection = await getThemeSelectionForArea('admin');
  const paymentConfigForm = composeBuildFormDefinition(
    createAdminProviderConfigBuildFormBase({
      formId: `admin-app-config-payment-provider-form-${selectedProvider}`,
      provider: selectedProvider,
      rows: providerRows,
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
          <CardTitle>{t('Payment methods')}</CardTitle>
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
        <CardHeader className="space-y-4">
          <CardTitle>
            {selectedProvider === 'stripe' ? t('Stripe') : t('PayPal')}
          </CardTitle>
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
                  {provider === 'stripe' ? t('Stripe') : t('PayPal')}
                </Link>
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={paymentConfigForm}
            area="admin"
            route="/admin/app-config/payments-methods"
            slot="admin.app-config.payment-methods"
          />
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
        title: t('Payment methods'),
        description: t(
          'Global runtime configuration shared between public pages and dashboard.'
        ),
        provider: selectedProvider
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
