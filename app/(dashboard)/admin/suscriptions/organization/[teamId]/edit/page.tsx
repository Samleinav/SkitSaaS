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
import { Label } from '@/components/ui/label';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { TemplateConfirmSubmitButton } from '@/components/ui/template-confirm-submit-button';
import {
  getAllSubscriptionTemplatesForAdmin
} from '@/lib/db/queries';
import {
  getAdminTeamById
} from '@/lib/db/queries.admin';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { ADMIN_TEAM_SUBSCRIPTION_STATUSES } from '../../../../subscriptions/form-utils';
import {
  clearTeamSubscriptionAction,
  updateTeamSubscriptionAction
} from '../../../actions';

type PageProps = {
  params: Promise<{ teamId: string }>;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

export default async function AdminEditOrganizationSubscriptionPage({
  params
}: PageProps) {
  const messages = await getServerMessages('admin');
  const { teamId } = await params;
  const parsedTeamId = Number(teamId);
  const subscriptionsTable = messages.subscriptionsTable;
  const saveLabel = subscriptionsTable.save;

  await requireAdminAccess();

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    notFound();
  }

  const [team, templates] = await Promise.all([
    getAdminTeamById(parsedTeamId),
    getAllSubscriptionTemplatesForAdmin()
  ]);

  if (!team) {
    notFound();
  }

  const organizationTemplates = templates.filter(
    (template) => template.targetScope === 'organization'
  );
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{messages.billingPage.title}</CardTitle>
          <CardDescription>{messages.billingPage.description}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/suscriptions">
            {messages.templateForm.scopes.organization}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
          <p className="font-medium">{team.name}</p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.membersHeader}: {team.membersCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stripe:{' '}
            {team.paymentProvider === 'stripe'
              ? team.providerReferenceId || '-'
              : '-'}
          </p>
          <p className="text-xs text-muted-foreground">
            PayPal:{' '}
            {team.paymentProvider === 'paypal'
              ? team.providerReferenceId || '-'
              : '-'}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.periodStartLabel}:{' '}
            {formatDateTime(team.subscriptionCurrentPeriodStart)}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.periodEndLabel}:{' '}
            {formatDateTime(team.subscriptionCurrentPeriodEnd)}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.trialEndsLabel}:{' '}
            {formatDateTime(team.subscriptionTrialEndsAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.cancelAtPeriodEndLabel}:{' '}
            {team.subscriptionCancelAtPeriodEnd === null
              ? '-'
              : team.subscriptionCancelAtPeriodEnd
                ? 'yes'
                : 'no'}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscriptionsTable.canceledAtLabel}:{' '}
            {formatDateTime(team.subscriptionCanceledAt)}
          </p>
        </div>

        <form action={updateTeamSubscriptionAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="teamId" value={team.id} />
          <input
            type="hidden"
            name="source"
            value={`/admin/suscriptions/organization/${team.id}/edit`}
          />

          <div className="space-y-2">
            <Label htmlFor="subscription-provider">
              {subscriptionsTable.providerHeader}
            </Label>
            <select
              id="subscription-provider"
              name="paymentProvider"
              defaultValue={team.paymentProvider || ''}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{subscriptionsTable.none}</option>
              <option value="stripe">{subscriptionsTable.stripe}</option>
              <option value="paypal">{subscriptionsTable.paypal}</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscription-status">{subscriptionsTable.statusHeader}</Label>
            <select
              id="subscription-status"
              name="subscriptionStatus"
              defaultValue={team.subscriptionStatus || 'free'}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ADMIN_TEAM_SUBSCRIPTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {subscriptionsTable[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="subscription-template">
              {messages.templateForm.templateNameLabel}
            </Label>
            <select
              id="subscription-template"
              name="templateId"
              defaultValue={team.subscriptionTemplateId || ''}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{subscriptionsTable.noTemplate}</option>
              {organizationTemplates.map((template) => {
                const intervalLabel =
                  messages.templateForm.intervals[
                    template.billingInterval as keyof typeof messages.templateForm.intervals
                  ] || template.billingInterval;

                return (
                  <option key={template.id} value={template.id}>
                    {`${template.name} (${intervalLabel})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-2">
            <TemplateAsyncSubmitButton
              area="admin"
              route={`/admin/suscriptions/organization/${team.id}/edit`}
              idleLabel={saveLabel}
              pendingLabel={`${saveLabel}...`}
            />
          </div>
        </form>

        <form
          id={`clear-team-subscription-${team.id}`}
          action={clearTeamSubscriptionAction}
          className="rounded-md border border-red-200 bg-red-50 p-4"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <input
            type="hidden"
            name="source"
            value={`/admin/suscriptions/organization/${team.id}/edit`}
          />
          <TemplateConfirmSubmitButton
            area="admin"
            route={`/admin/suscriptions/organization/${team.id}/edit`}
            formId={`clear-team-subscription-${team.id}`}
            title={subscriptionsTable.confirmClearTitle}
            description={subscriptionsTable.confirmClearDescription}
            triggerLabel={subscriptionsTable.clear}
            confirmLabel={subscriptionsTable.confirm}
            cancelLabel={subscriptionsTable.cancel}
            triggerVariant="destructive"
            triggerSize="sm"
          />
        </form>
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.suscriptions.organization.edit"
      data={{
        title: messages.billingPage.title,
        description: messages.billingPage.description,
        teamId: team.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
