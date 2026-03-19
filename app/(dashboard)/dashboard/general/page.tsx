import { redirect } from 'next/navigation';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { getUser } from '@/lib/db/queries';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { createDashboardUpdateAccountBuildFormBase } from './forms';

export default async function GeneralPage() {
  const [t, currentUser, themeSelection] = await Promise.all([
    getServerTranslator({ area: 'dashboard' }),
    getUser(),
    getThemeSelectionForArea('dashboard')
  ]);

  if (!currentUser) {
    redirect('/login');
  }

  const accountForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-account-form',
    createDashboardUpdateAccountBuildFormBase({
      copy: {
        nameLabel: t('Name'),
        namePlaceholder: t('Enter your name'),
        emailLabel: t('Email'),
        emailPlaceholder: t('Enter your email')
      }
    }),
    {
      submit: {
        idleLabel: t('Save Changes'),
        pendingLabel: t('Saving...'),
        align: 'start'
      },
      values: {
        userId: currentUser.id,
        name: currentUser.name ?? '',
        email: currentUser.email
      }
    }
  );
  const fallbackPage = (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <h1 className="text-lg font-medium text-foreground lg:text-2xl">
        {t('General Settings')}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('Account Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateBuildForm
            definition={accountForm}
            area="dashboard"
            route="/dashboard/general"
            slot="dashboard.general.account"
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
      id="page.dashboard.general"
      data={{
        title: t('General Settings'),
        description: t('Account Information')
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
