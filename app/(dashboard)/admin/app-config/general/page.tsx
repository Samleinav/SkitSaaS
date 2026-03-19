import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getAdminAppConfigData } from '../config';
import { createAdminOrganizationControlsBuildFormBase } from '../forms';

export default async function AdminAppConfigGeneralPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const savingLabel = `${t('Save')}...`;

  const {
    organizationAllowMultiConfig,
    organizationMaxConfig,
    allowMultiOrganizations,
    maxOrganizationsPerUser
  } = await getAdminAppConfigData();
  const themeSelection = await getThemeSelectionForArea('admin');
  const organizationControlsForm = composeRegisteredBuildFormDefinition(
    'admin-app-config-general-form',
    createAdminOrganizationControlsBuildFormBase({
      copy: {
        allowMultiOrganizationsLabel: t('Allow multi organizations per user'),
        allowMultiOrganizationsHint: t(
          'If disabled, each user can only belong to one organization.'
        ),
        maxOrganizationsPerUserLabel: t(
          'Max organizations per user (optional)'
        ),
        maxOrganizationsPerUserHint: t(
          'Leave empty for unlimited when multi organizations are enabled.'
        ),
        unlimitedPlaceholder: t('Unlimited'),
        envPrefix: t('ENV'),
        sourcePrefix: t('Value source')
      },
      allowMultiOrganizationsEnvKey: organizationAllowMultiConfig.envKey,
      allowMultiOrganizationsSource: organizationAllowMultiConfig.source,
      maxOrganizationsPerUserEnvKey: organizationMaxConfig.envKey,
      maxOrganizationsPerUserSource: organizationMaxConfig.source
    }),
    {
      submit: {
        idleLabel: t('Save'),
        pendingLabel: savingLabel,
        align: 'end',
        size: 'sm',
        variant: 'outline'
      },
      values: {
        allowMultiOrganizations,
        maxOrganizationsPerUser: maxOrganizationsPerUser ?? null
      }
    }
  );

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
          <CardTitle>{t('Organizations')}</CardTitle>
          <CardDescription>
            {t('Control multi-organization limits per user.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={organizationControlsForm}
            area="admin"
            route="/admin/app-config/general"
            slot="admin.app-config.general"
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
