import { redirect } from 'next/navigation';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { getUser } from '@/lib/db/queries';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { createDashboardUpdateAccountBuildFormBase } from './forms';

export default async function GeneralPage() {
  const [messages, currentUser, themeSelection] = await Promise.all([
    getServerMessages('dashboard'),
    getUser(),
    getThemeSelectionForArea('dashboard')
  ]);

  if (!currentUser) {
    redirect('/login');
  }

  const general = messages.general;
  const accountForm = composeRegisteredBuildFormDefinition(
    'dashboard-update-account-form',
    createDashboardUpdateAccountBuildFormBase({
      copy: {
        nameLabel: general.name,
        namePlaceholder: general.namePlaceholder,
        emailLabel: general.email,
        emailPlaceholder: general.emailPlaceholder
      }
    }),
    {
      submit: {
        idleLabel: general.saveChanges,
        pendingLabel: general.saving,
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
        {general.title}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{general.accountInformation}</CardTitle>
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
        title: general.title,
        description: general.accountInformation
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
