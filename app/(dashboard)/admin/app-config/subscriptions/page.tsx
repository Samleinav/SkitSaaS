import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { composeBuildFormDefinition } from '@skitsaas/sdk';
import { getServerTranslator } from '@/lib/i18n/server';
import { areTeamsEnabled } from '@/lib/organizations/config';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getAdminSignupPolicyConfigData } from '../config';
import { createAdminSignupPolicyBuildFormBase } from '../forms';
import { upsertSignupPolicyConfigAction } from '../actions';

export default async function AdminAppConfigSubscriptionsPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const teamsEnabled = areTeamsEnabled();
  const themeSelection = await getThemeSelectionForArea('admin');
  const {
    signupPolicyRows,
    organizationTemplateOptions,
    userTemplateOptions,
    freeOrganizationTemplateOptions,
    freeUserTemplateOptions
  } = await getAdminSignupPolicyConfigData();
  const savingLabel = `${t('Save')}...`;
  const signupPolicyForm = composeBuildFormDefinition(
    createAdminSignupPolicyBuildFormBase({
      formId: 'admin-app-config-signup-policy-form',
      rows: signupPolicyRows,
      organizationTemplateOptions,
      userTemplateOptions,
      freeOrganizationTemplateOptions,
      freeUserTemplateOptions,
      copy: {
        envPrefix: t('ENV'),
        sourcePrefix: t('Value source'),
        overriddenByEnv: t('Overridden by env'),
        dbFallbackValue: t('DB fallback value'),
        signupDefaultOrganizationTemplateLabel: t(
          'Organization signup default'
        ),
        signupDefaultUserTemplateLabel: t('User signup default'),
        signupDefaultOrganizationTemplateDescription: t(
          'Used when TEAMS_ENABLED=true and a new organization is created during sign-up.'
        ),
        signupDefaultUserTemplateDescription: t(
          'Used for standalone sign-up when TEAMS_ENABLED=false.'
        ),
        publicFreeOrganizationTemplateLabel: t(
          'Public free organization fallback'
        ),
        publicFreeUserTemplateLabel: t('Public free user fallback'),
        publicFreeOrganizationTemplateDescription: t(
          'Optional published zero-cost organization template used when lifecycle fallback mode is public_free.'
        ),
        publicFreeUserTemplateDescription: t(
          'Optional published zero-cost user template used when lifecycle fallback mode is public_free.'
        ),
        subscriptionFailureFallbackModeLabel: t(
          'Subscription failure fallback mode'
        ),
        subscriptionFailureFallbackModeDescription: t(
          'Controls where failed or canceled paid subscriptions land after lifecycle projection.'
        ),
        fallbackModeBaselineLabel: t('System baseline'),
        fallbackModePublicFreeLabel: t('Public free template'),
        noneTemplateLabel: t('None configured')
      }
    }),
    {
      request: {
        action: upsertSignupPolicyConfigAction,
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
          <CardTitle>{t('Subscriptions')}</CardTitle>
          <CardDescription>
            {t(
              'Manage public signup defaults, free fallback templates, and lifecycle recovery policy.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              {t(
                'Environment values have priority. DB values are used only when env is empty.'
              )}
            </p>
            <p>
              {teamsEnabled
                ? t(
                    'Current deployment mode: organizations are enabled, so public sign-up uses the organization signup default.'
                  )
                : t(
                    'Current deployment mode: standalone users only, so public sign-up uses the user signup default.'
                  )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Signup and recovery policy')}</CardTitle>
          <CardDescription>
            {t(
              'Choose which published templates drive public sign-up and where failed paid subscriptions should fall back.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TemplateBuildForm
            definition={signupPolicyForm}
            area="admin"
            route="/admin/app-config/subscriptions"
            slot="admin.app-config.subscriptions"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Operational notes')}</CardTitle>
          <CardDescription>
            {t(
              'Keep commercial signup templates published and keep baseline templates reserved for internal fallback behavior.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {t(
              'Zero-cost signup defaults are provisioned immediately during password sign-up.'
            )}
          </p>
          <p>
            {t(
              'Paid signup defaults route public registration through the pre-account signup-intent checkout flow before the real account is created.'
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
      id="page.admin.app-config.subscriptions"
      data={{
        title: t('Subscriptions'),
        description: t(
          'Manage public signup defaults, free fallback templates, and lifecycle recovery policy.'
        )
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
