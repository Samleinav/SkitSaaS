import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { upsertOrganizationControlsAction } from '../actions';
import { getAdminAppConfigData } from '../config';

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
          <form action={upsertOrganizationControlsAction} className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="allowMultiOrganizations"
                  value="true"
                  defaultChecked={allowMultiOrganizations}
                  className="h-4 w-4 rounded border-input bg-background"
                />
                {appConfig.organization.allowMultiOrganizationsLabel}
              </label>
              <p className="text-xs text-muted-foreground">
                {appConfig.organization.allowMultiOrganizationsHint}
              </p>
              <p className="text-xs text-muted-foreground">
                {appConfig.envPrefix}: {organizationAllowMultiConfig.envKey} -{' '}
                {appConfig.sourcePrefix}: {organizationAllowMultiConfig.source}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">
                {appConfig.organization.maxOrganizationsPerUserLabel}
              </p>
              <input
                type="number"
                name="maxOrganizationsPerUser"
                min={1}
                step={1}
                defaultValue={maxOrganizationsPerUser ?? ''}
                placeholder={appConfig.organization.unlimitedPlaceholder}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {appConfig.organization.maxOrganizationsPerUserHint}
              </p>
              <p className="text-xs text-muted-foreground">
                {appConfig.envPrefix}: {organizationMaxConfig.envKey} -{' '}
                {appConfig.sourcePrefix}: {organizationMaxConfig.source}
              </p>
            </div>

            <div className="flex justify-end">
              <TemplateAsyncSubmitButton
                area="admin"
                route="/admin/app-config/general"
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
      id="page.admin.app-config.general"
      themeId={themeSelection.themeKey}
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
