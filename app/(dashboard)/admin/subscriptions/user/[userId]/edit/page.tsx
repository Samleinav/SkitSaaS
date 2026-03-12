import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import {
  getAdminUserById,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { resolveAdminUserDisplayStatus } from '../../../../users/status';
import { createAdminUpdateUserSubscriptionBuildFormBase } from '../../../../suscriptions/forms';

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminEditUserSubscriptionPage({ params }: PageProps) {
  const messages = await getServerMessages('admin');
  const { userId } = await params;
  const parsedUserId = Number(userId);

  await requireAdminAccess();

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    notFound();
  }

  const [user, templates] = await Promise.all([
    getAdminUserById(parsedUserId),
    getUserSubscriptionTemplatesForAdmin()
  ]);

  if (!user) {
    notFound();
  }

  const status = resolveAdminUserDisplayStatus({
    deletedAt: user.deletedAt,
    accountStatus: user.accountStatus
  });
  const isDeleted = status === 'deleted';
  const saveLabel = messages.subscriptionsTable.save;
  const themeSelection = await getThemeSelectionForArea('admin');
  const userSubscriptionForm = composeRegisteredBuildFormDefinition(
    'admin-update-user-subscription-form',
    createAdminUpdateUserSubscriptionBuildFormBase({
      copy: {
        templateLabel: messages.userDetailPage.profileSubscriptionLabel,
        noTemplate: messages.subscriptionsTable.noTemplate
      },
      templateOptions: templates.map((template) => ({
        id: template.id,
        name: template.name,
        billingInterval: template.billingInterval
      })),
      disabled: isDeleted
    }),
    {
      request: isDeleted ? null : undefined,
      submit: isDeleted
        ? null
        : {
            idleLabel: saveLabel,
            pendingLabel: `${saveLabel}...`,
            align: 'start'
          },
      values: {
        userId: user.id,
        source: `/admin/subscriptions/user/${user.id}/edit`,
        templateId: user.subscriptionTemplateId ?? null
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{messages.userDetailPage.profileSubscriptionLabel}</CardTitle>
          <CardDescription>{messages.userDetailPage.profileDescription}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions?scope=user">
            {messages.userDetailPage.backToUsers}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-medium text-foreground">
              {messages.userDetailPage.userLabel}
            </p>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <p className="font-medium">{user.name || messages.usersTable.unnamedUser}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <TemplateBuildForm
              definition={userSubscriptionForm}
              area="admin"
              route={`/admin/subscriptions/user/${user.id}/edit`}
              slot="admin.suscriptions.user.edit"
            />
          </div>

          {isDeleted ? (
            <p className="text-xs text-muted-foreground md:col-span-2">
              {messages.userDetailPage.profileDisabledForDeleted}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.suscriptions.user.edit"
      data={{
        title: messages.userDetailPage.profileSubscriptionLabel,
        description: messages.userDetailPage.profileDescription,
        userId: user.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
