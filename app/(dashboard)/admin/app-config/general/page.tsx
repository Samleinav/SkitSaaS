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
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getAdminAppConfigData } from '../config';
import { createAdminOrganizationControlsBuildFormBase } from '../forms';

export default async function AdminAppConfigGeneralPage() {
  const messages = await getServerMessages('admin');
  const appConfig = messages.appConfig;
  const savingLabel = `${appConfig.save}...`;

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
        allowMultiOrganizationsLabel:
          appConfig.organization.allowMultiOrganizationsLabel,
        allowMultiOrganizationsHint:
          appConfig.organization.allowMultiOrganizationsHint,
        maxOrganizationsPerUserLabel:
          appConfig.organization.maxOrganizationsPerUserLabel,
        maxOrganizationsPerUserHint:
          appConfig.organization.maxOrganizationsPerUserHint,
        unlimitedPlaceholder: appConfig.organization.unlimitedPlaceholder,
        envPrefix: appConfig.envPrefix,
        sourcePrefix: appConfig.sourcePrefix
      },
      allowMultiOrganizationsEnvKey: organizationAllowMultiConfig.envKey,
      allowMultiOrganizationsSource: organizationAllowMultiConfig.source,
      maxOrganizationsPerUserEnvKey: organizationMaxConfig.envKey,
      maxOrganizationsPerUserSource: organizationMaxConfig.source
    }),
    {
      submit: {
        idleLabel: appConfig.save,
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
          <CardTitle>{appConfig.sections.general}</CardTitle>
          <CardDescription>{appConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{appConfig.envPriority}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{appConfig.organization.title}</CardTitle>
          <CardDescription>{appConfig.organization.description}</CardDescription>
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
        title: appConfig.sections.general,
        description: appConfig.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
