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
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { ADMIN_TEAM_SUBSCRIPTION_STATUSES } from '../../../form-utils';
import {
  createAdminClearOrganizationSubscriptionBuildFormBase,
  createAdminManageOrganizationSubscriptionBuildFormBase
} from '../../../../suscriptions/forms';
import { getAdminSubscriptionIntervalLabels } from '../../../i18n';
import {
  formatSubscriptionPrice,
  getPaymentProviderClassName,
  getSubscriptionStatusClassName,
  type AdminNormalizedSubscriptionStatus
} from '../../../presentation';
import { formatDateTime, normalizeSubscriptionStatus } from '../../../../utils';

type PageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function AdminEditOrganizationSubscriptionPage({
  params
}: PageProps) {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const { teamId } = await params;
  const parsedTeamId = Number(teamId);

  await requireAdminAccess();

  if (!Number.isInteger(parsedTeamId) || parsedTeamId <= 0) {
    notFound();
  }

  const [team, templates] = await Promise.all([
    getAdminTeamById(parsedTeamId),
    getAllSubscriptionTemplatesForAdmin({ includeReserved: true })
  ]);

  if (!team) {
    notFound();
  }

  const organizationTemplates = templates.filter(
    (template) => template.targetScope === 'organization'
  );
  const themeSelection = await getThemeSelectionForArea('admin');
  const dateLocale = getDateLocale(locale);
  const intervalLabels = getAdminSubscriptionIntervalLabels(t);
  const normalizedSubscriptionStatus =
    normalizeSubscriptionStatus(
      team.subscriptionStatus
    ) as AdminNormalizedSubscriptionStatus;
  const subscriptionStatusLabels: Record<AdminNormalizedSubscriptionStatus, string> =
    {
      free: t('Free'),
      trialing: t('trialing'),
      active: t('active'),
      unpaid: t('unpaid'),
      canceled: t('canceled')
    };
  const providerLabel = team.paymentProvider || t('none');
  const planIntervalLabel =
    team.subscriptionTemplateInterval
      ? intervalLabels[
          team.subscriptionTemplateInterval as keyof typeof intervalLabels
        ] || team.subscriptionTemplateInterval
      : null;
  const planPriceLabel = formatSubscriptionPrice({
    priceCents: team.subscriptionTemplatePriceCents,
    currency: team.subscriptionTemplateCurrency,
    locale: dateLocale
  });
  const planMetaLabel = [planPriceLabel, planIntervalLabel].filter(Boolean).join(' / ');
  const lifecycleLabel = team.subscriptionCanceledAt
    ? `${t('Canceled')} ${formatDateTime(team.subscriptionCanceledAt, dateLocale)}`
    : team.subscriptionTrialEndsAt
      ? `${t('Trial ends')} ${formatDateTime(team.subscriptionTrialEndsAt, dateLocale)}`
      : team.subscriptionCurrentPeriodEnd
        ? `${t('Renews')} ${formatDateTime(team.subscriptionCurrentPeriodEnd, dateLocale)}`
        : t('No billing cycle');
  const manageSubscriptionForm = composeRegisteredBuildFormDefinition(
    'admin-manage-organization-subscription-form',
    createAdminManageOrganizationSubscriptionBuildFormBase({
      copy: {
        providerLabel: t('Provider'),
        statusLabel: t('Status'),
        templateLabel: t('Template name'),
        noTemplate: t('System baseline'),
        providers: {
          none: t('none'),
          stripe: t('stripe'),
          paypal: t('paypal')
        },
        statuses: Object.fromEntries(
          ADMIN_TEAM_SUBSCRIPTION_STATUSES.map((status) => [
            status,
            status === 'free' ? t('Free') : t(status)
          ])
        ) as Record<(typeof ADMIN_TEAM_SUBSCRIPTION_STATUSES)[number], string>
      },
      templateOptions: organizationTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        billingInterval:
          intervalLabels[
            template.billingInterval as keyof typeof intervalLabels
          ] || template.billingInterval
      }))
    }),
    {
      submit: {
        idleLabel: t('Save'),
        pendingLabel: `${t('Save')}...`,
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
        idleLabel: t('Clear'),
        pendingLabel: `${t('Clear')}...`,
        align: 'start',
        confirm: {
          title: t('Clear subscription for this team?'),
          description: t(
            'This removes provider references and returns the team to the system baseline.'
          ),
          confirmLabel: t('Clear subscription'),
          cancelLabel: t('Cancel'),
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
          <CardTitle>{t('Billing')}</CardTitle>
          <CardDescription>
            {t('Manage team subscriptions and billing status.')}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions">
            {t('Organization')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{team.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('Members')}: {team.membersCount}
              </p>
              <p className="text-xs text-muted-foreground">{lifecycleLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={getPaymentProviderClassName(team.paymentProvider)}>
                {providerLabel}
              </span>
              <span className={getSubscriptionStatusClassName(normalizedSubscriptionStatus)}>
                {subscriptionStatusLabels[normalizedSubscriptionStatus]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Status')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {subscriptionStatusLabels[normalizedSubscriptionStatus]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{lifecycleLabel}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Provider')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {providerLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {team.providerReferenceId || t('No provider identifiers')}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Template')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {team.subscriptionTemplateName || t('System baseline')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {team.subscriptionTemplateId
                ? `#${team.subscriptionTemplateId}`
                : t('System baseline')}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Billing')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {planMetaLabel || t('No billing cycle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('Created')} {formatDateTime(team.createdAt, dateLocale)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs font-medium text-foreground">
              {t('Provider identifiers')}
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('Reference')}
                </dt>
                <dd className="mt-1 font-mono text-xs text-foreground">
                  {team.providerReferenceId || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('Provider plan')}
                </dt>
                <dd className="mt-1 font-mono text-xs text-foreground">
                  {team.providerPlanId || '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs font-medium text-foreground">
              {t('Lifecycle')}
            </p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {[
                [t('Period start'), formatDateTime(team.subscriptionCurrentPeriodStart, dateLocale)],
                [t('Period end'), formatDateTime(team.subscriptionCurrentPeriodEnd, dateLocale)],
                [t('Trial ends'), formatDateTime(team.subscriptionTrialEndsAt, dateLocale)],
                [
                  t('Cancel at period end'),
                  team.subscriptionCancelAtPeriodEnd === null
                    ? '-'
                    : team.subscriptionCancelAtPeriodEnd
                      ? t('Yes')
                      : t('No')
                ],
                [t('Canceled at'), formatDateTime(team.subscriptionCanceledAt, dateLocale)],
                [t('Updated'), formatDateTime(team.updatedAt, dateLocale)]
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/80 p-4">
          <div className="mb-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t('Update organization subscription')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Adjust provider, status, and assigned template from one place.')}
            </p>
          </div>
          <TemplateBuildForm
            definition={manageSubscriptionForm}
            area="admin"
            route={`/admin/subscriptions/organization/${team.id}/edit`}
            slot="admin.suscriptions.organization.edit"
          />
        </div>

        <div className="rounded-xl border border-red-200/70 bg-red-50/80 p-4 dark:border-red-950 dark:bg-red-950/20">
          <div className="mb-3 space-y-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-200">
              {t('Reset to free')}
            </p>
            <p className="text-xs text-red-700/80 dark:text-red-200/80">
              {t(
                'Use this only when provider references must be cleared and the team should return to the reserved system baseline.'
              )}
            </p>
          </div>
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
        title: t('Billing'),
        description: t('Manage team subscriptions and billing status.'),
        teamId: team.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
