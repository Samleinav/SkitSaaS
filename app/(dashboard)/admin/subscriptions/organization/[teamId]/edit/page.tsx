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
  getAllSubscriptionTemplatesForAdmin,
  getAdminTeamById
} from '@/lib/db/queries.admin';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { ADMIN_TEAM_SUBSCRIPTION_STATUSES } from '../../../form-utils';
import {
  createAdminClearOrganizationSubscriptionBuildFormBase,
  createAdminManageOrganizationSubscriptionBuildFormBase
} from '../../../../suscriptions/forms';

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
  const manageSubscriptionForm = composeRegisteredBuildFormDefinition(
    'admin-manage-organization-subscription-form',
    createAdminManageOrganizationSubscriptionBuildFormBase({
      copy: {
        providerLabel: subscriptionsTable.providerHeader,
        statusLabel: subscriptionsTable.statusHeader,
        templateLabel: messages.templateForm.templateNameLabel,
        noTemplate: subscriptionsTable.noTemplate,
        providers: {
          none: subscriptionsTable.none,
          stripe: subscriptionsTable.stripe,
          paypal: subscriptionsTable.paypal
        },
        statuses: Object.fromEntries(
          ADMIN_TEAM_SUBSCRIPTION_STATUSES.map((status) => [
            status,
            subscriptionsTable[status]
          ])
        ) as Record<(typeof ADMIN_TEAM_SUBSCRIPTION_STATUSES)[number], string>
      },
      templateOptions: organizationTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        billingInterval:
          messages.templateForm.intervals[
            template.billingInterval as keyof typeof messages.templateForm.intervals
          ] || template.billingInterval
      }))
    }),
    {
      submit: {
        idleLabel: saveLabel,
        pendingLabel: `${saveLabel}...`,
        align: 'start'
      },
      values: {
        teamId: team.id,
        source: `/admin/subscriptions/organization/${team.id}/edit`,
        paymentProvider: team.paymentProvider ?? '',
        subscriptionStatus: team.subscriptionStatus || 'free',
        templateId: team.subscriptionTemplateId ?? null
      }
    }
  );
  const clearSubscriptionForm = composeRegisteredBuildFormDefinition(
    'admin-clear-organization-subscription-form',
    createAdminClearOrganizationSubscriptionBuildFormBase(),
    {
      submit: {
        idleLabel: subscriptionsTable.clear,
        pendingLabel: `${subscriptionsTable.clear}...`,
        align: 'start',
        confirm: {
          title: subscriptionsTable.confirmClearTitle,
          description: subscriptionsTable.confirmClearDescription,
          confirmLabel: subscriptionsTable.confirm,
          cancelLabel: subscriptionsTable.cancel,
          triggerVariant: 'destructive',
          confirmVariant: 'destructive'
        }
      },
      values: {
        teamId: team.id,
        source: `/admin/subscriptions/organization/${team.id}/edit`
      }
    }
  );

  const fallbackPage = (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{messages.billingPage.title}</CardTitle>
          <CardDescription>{messages.billingPage.description}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions">
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

        <TemplateBuildForm
          definition={manageSubscriptionForm}
          area="admin"
          route={`/admin/subscriptions/organization/${team.id}/edit`}
          slot="admin.suscriptions.organization.edit"
        />

        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <TemplateBuildForm
            definition={clearSubscriptionForm}
            area="admin"
            route={`/admin/subscriptions/organization/${team.id}/edit`}
            slot="admin.suscriptions.organization.clear"
          />
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
