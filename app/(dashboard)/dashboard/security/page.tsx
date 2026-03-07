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
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from './forms';

export default async function SecurityPage() {
  const [messages, currentUser, themeSelection] = await Promise.all([
    getServerMessages('dashboard'),
    getUser(),
    getThemeSelectionForArea('dashboard')
  ]);

  if (!currentUser) {
    redirect('/login');
  }

  const security = messages.security;
  const updatePasswordForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-password-form',
    createDashboardUpdatePasswordBuildFormBase({
      copy: {
        currentPasswordLabel: security.currentPassword,
        newPasswordLabel: security.newPassword,
        confirmPasswordLabel: security.confirmNewPassword
      }
    }),
    {
      submit: {
        idleLabel: security.updatePassword,
        pendingLabel: security.updating,
        align: 'start'
      }
    }
  );
  const deleteAccountForm = composeRegisteredBuildFormDefinition(
    'dashboard-delete-account-form',
    createDashboardDeleteAccountBuildFormBase({
      copy: {
        passwordLabel: security.confirmPassword
      }
    }),
    {
      submit: {
        idleLabel: security.deleteAccount,
        pendingLabel: security.deleting,
        align: 'start',
        variant: 'destructive',
        confirm: {
          title: security.confirmDeleteTitle,
          description: security.confirmDeleteDescription,
          confirmLabel: security.confirm,
          cancelLabel: security.cancel,
          triggerVariant: 'destructive',
          confirmVariant: 'destructive'
        }
      }
    }
  );
  const fallbackPage = (
    <section className="flex-1 space-y-8 p-4 lg:p-8">
      <h1 className="text-lg font-medium text-foreground lg:text-2xl">
        {security.title}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{security.passwordTitle}</CardTitle>
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
          <CardTitle>{security.deleteAccountTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {security.deleteWarning}
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
        title: security.title,
        description: security.passwordTitle
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
