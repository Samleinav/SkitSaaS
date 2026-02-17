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
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { Label } from '@/components/ui/label';
import {
  getAdminUserById,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { updateUserSubscriptionAction } from '../../../actions';
import { resolveAdminUserDisplayStatus } from '../../../../users/status';

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

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{messages.userDetailPage.profileSubscriptionLabel}</CardTitle>
          <CardDescription>{messages.userDetailPage.profileDescription}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/suscriptions?scope=user">
            {messages.userDetailPage.backToUsers}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form action={updateUserSubscriptionAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="source"
            value={`/admin/suscriptions/user/${user.id}/edit`}
          />

          <div className="space-y-2 md:col-span-2">
            <Label>{messages.userDetailPage.userLabel}</Label>
            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <p className="font-medium">{user.name || messages.usersTable.unnamedUser}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user-subscription-template">
              {messages.userDetailPage.profileSubscriptionLabel}
            </Label>
            <select
              id="user-subscription-template"
              name="templateId"
              defaultValue={user.subscriptionTemplateId || ''}
              disabled={isDeleted}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{messages.subscriptionsTable.noTemplate}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {`${template.name} (${template.billingInterval})`}
                </option>
              ))}
            </select>
          </div>

          {isDeleted ? (
            <p className="text-xs text-muted-foreground md:col-span-2">
              {messages.userDetailPage.profileDisabledForDeleted}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <TemplateAsyncSubmitButton
              area="admin"
              route={`/admin/suscriptions/user/${user.id}/edit`}
              idleLabel={saveLabel}
              pendingLabel={`${saveLabel}...`}
              disabled={isDeleted}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.suscriptions.user.edit"
      themeId={themeSelection.themeKey}
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
