import { redirect } from 'next/navigation';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { getUser } from '@/lib/db/queries';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from './forms';

export default async function SecurityPage() {
  const [t, currentUser, themeSelection] = await Promise.all([
    getServerTranslator({ area: 'dashboard' }),
    getUser(),
    getThemeSelectionForArea('dashboard')
  ]);

  if (!currentUser) {
    redirect('/login');
  }

  const updatePasswordForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-password-form',
    createDashboardUpdatePasswordBuildFormBase({
      copy: {
        currentPasswordLabel: t('Current Password'),
        newPasswordLabel: t('New Password'),
        confirmPasswordLabel: t('Confirm New Password')
      }
    }),
    {
      submit: {
        idleLabel: t('Update Password'),
        pendingLabel: t('Updating...'),
        align: 'start'
      }
    }
  );
  const deleteAccountForm = composeRegisteredBuildFormDefinition(
    'dashboard-delete-account-form',
    createDashboardDeleteAccountBuildFormBase({
      copy: {
        passwordLabel: t('Confirm Password')
      }
    }),
    {
      submit: {
        idleLabel: t('Delete Account'),
        pendingLabel: t('Deleting...'),
        align: 'start',
        variant: 'destructive',
        confirm: {
          title: t('Delete your account?'),
          description: t(
            'This action is permanent and removes your account data.'
          ),
          confirmLabel: t('Delete account'),
          cancelLabel: t('Cancel'),
          triggerVariant: 'destructive',
          confirmVariant: 'destructive'
        }
      }
    }
  );
  const fallbackPage = (
    <section className="flex-1 space-y-8 p-4 lg:p-8">
      <h1 className="text-lg font-medium text-foreground lg:text-2xl">
        {t('Security Settings')}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('Password')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={updatePasswordForm}
            area="dashboard"
            route="/dashboard/security"
            slot="dashboard.security.update-password"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Delete Account')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              'Account deletion is non-reversable. Please proceed with caution.'
            )}
          </p>
          <TemplateBuildForm
            definition={deleteAccountForm}
            area="dashboard"
            route="/dashboard/security"
            slot="dashboard.security.delete-account"
          />
        </CardContent>
      </Card>
    </section>
  );

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.dashboard.security"
      data={{
        title: t('Security Settings'),
        description: t('Password')
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
