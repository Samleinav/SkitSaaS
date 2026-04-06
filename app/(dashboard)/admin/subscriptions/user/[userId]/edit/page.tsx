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
  getAdminUserOrganizations,
  getAdminUserById,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { composeRegisteredBuildFormDefinition } from '@/lib/forms/registry';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../../../../guards';
import { resolveAdminUserDisplayStatus } from '../../../../users/status';
import { createAdminUpdateUserSubscriptionBuildFormBase } from '../../../../suscriptions/forms';
import { formatDateTime, normalizeSubscriptionStatus } from '../../../../utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { getAdminSubscriptionIntervalLabels } from '../../../i18n';
import {
  formatSubscriptionPrice,
  getPaymentProviderClassName,
  getSubscriptionStatusClassName,
  type AdminNormalizedSubscriptionStatus
} from '../../../presentation';

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminEditUserSubscriptionPage({ params }: PageProps) {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const { userId } = await params;
  const parsedUserId = Number(userId);

  await requireAdminAccess();

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    notFound();
  }

  const [user, templates, organizations] = await Promise.all([
    getAdminUserById(parsedUserId),
    getUserSubscriptionTemplatesForAdmin(),
    getAdminUserOrganizations(parsedUserId)
  ]);

  if (!user) {
    notFound();
  }

  const status = resolveAdminUserDisplayStatus({
    deletedAt: user.deletedAt,
    accountStatus: user.accountStatus
  });
  const isDeleted = status === 'deleted';
  const themeSelection = await getThemeSelectionForArea('admin');
  const dateLocale = getDateLocale(locale);
  const intervalLabels = getAdminSubscriptionIntervalLabels(t);
  const normalizedSubscriptionStatus =
    normalizeSubscriptionStatus(
      user.subscriptionStatus
    ) as AdminNormalizedSubscriptionStatus;
  const subscriptionStatusLabels: Record<AdminNormalizedSubscriptionStatus, string> =
    {
      free: t('Free'),
      trialing: t('trialing'),
      active: t('active'),
      unpaid: t('unpaid'),
      canceled: t('canceled')
    };
  const providerLabel = user.paymentProvider || t('none');
  const planIntervalLabel =
    user.subscriptionTemplateInterval
      ? intervalLabels[
          user.subscriptionTemplateInterval as keyof typeof intervalLabels
        ] || user.subscriptionTemplateInterval
      : null;
  const userPlanPriceLabel = formatSubscriptionPrice({
    priceCents: user.subscriptionTemplatePriceCents,
    currency: user.subscriptionTemplateCurrency,
    locale: dateLocale
  });
  const userPlanMetaLabel = [userPlanPriceLabel, planIntervalLabel]
    .filter(Boolean)
    .join(' / ');
  const userLifecycleLabel = user.subscriptionCanceledAt
    ? `${t('Canceled')} ${formatDateTime(user.subscriptionCanceledAt, dateLocale)}`
    : user.subscriptionTrialEndsAt
      ? `${t('Trial ends')} ${formatDateTime(user.subscriptionTrialEndsAt, dateLocale)}`
      : user.subscriptionCurrentPeriodEnd
        ? `${t('Renews')} ${formatDateTime(user.subscriptionCurrentPeriodEnd, dateLocale)}`
        : t('No billing cycle');
  const userSubscriptionForm = composeRegisteredBuildFormDefinition(
    'admin-update-user-subscription-form',
    createAdminUpdateUserSubscriptionBuildFormBase({
      copy: {
        templateLabel: t('User subscription template'),
        noTemplate: t('Free (no template)')
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
            idleLabel: t('Save'),
            pendingLabel: `${t('Save')}...`,
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
          <CardTitle>{t('User subscription template')}</CardTitle>
          <CardDescription>
            {t('Update identity and user-level subscription assignment.')}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions?scope=user">
            {t('Back to users')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {user.name || t('Unnamed user')}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                {t('Created')} {formatDateTime(user.createdAt, dateLocale)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={getSubscriptionStatusClassName(normalizedSubscriptionStatus)}>
                {subscriptionStatusLabels[normalizedSubscriptionStatus]}
              </span>
              <span className={getPaymentProviderClassName(user.paymentProvider)}>
                {providerLabel}
              </span>
              <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('User subscription')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {user.subscriptionTemplateName || t('Free (no template)')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {user.subscriptionTemplateId
                ? `#${user.subscriptionTemplateId}`
                : t('Free (no template)')}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Billing')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {userPlanMetaLabel || t('No billing cycle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {userLifecycleLabel}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Organizations')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {user.organizationsCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('Owner in')} {user.ownedOrganizationsCount}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('Account')}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground capitalize">
              {status}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDeleted
                ? t('Deleted accounts cannot be edited.')
                : t('This form only changes the user-scope assignment.')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t('Provider identifiers')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('Inspect the current provider linkage for the user-scope assignment.')}
              </p>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('Provider')}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{providerLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('Reference')}
                </dt>
                <dd className="mt-1 font-mono text-xs text-foreground">
                  {user.providerReferenceId || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('Provider plan')}
                </dt>
                <dd className="mt-1 font-mono text-xs text-foreground">
                  {user.providerPlanId || '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t('Lifecycle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('Review billing cycle and cancellation state before editing the assignment.')}
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                [t('Period start'), formatDateTime(user.subscriptionCurrentPeriodStart, dateLocale)],
                [t('Period end'), formatDateTime(user.subscriptionCurrentPeriodEnd, dateLocale)],
                [t('Trial ends'), formatDateTime(user.subscriptionTrialEndsAt, dateLocale)],
                [
                  t('Cancel at period end'),
                  user.subscriptionCancelAtPeriodEnd === null
                    ? '-'
                    : user.subscriptionCancelAtPeriodEnd
                      ? t('Yes')
                      : t('No')
                ],
                [t('Canceled at'), formatDateTime(user.subscriptionCanceledAt, dateLocale)],
                [t('Updated'), formatDateTime(user.updatedAt, dateLocale)]
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
              {t('Update user subscription')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Assign or change the user-scope template without touching organization subscriptions.')}
            </p>
          </div>
          <TemplateBuildForm
            definition={userSubscriptionForm}
            area="admin"
            route={`/admin/subscriptions/user/${user.id}/edit`}
            slot="admin.suscriptions.user.edit"
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="mb-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t('Organization memberships')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Review the organization-side subscriptions this user is attached to.')}
            </p>
          </div>

          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('This user does not belong to any organization.')}
            </p>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Organization')}</TableHead>
                  <TableHead>{t('Role')}</TableHead>
                  <TableHead>{t('Subscription')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Provider')}</TableHead>
                  <TableHead>{t('Joined')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((organization) => {
                  const organizationStatus =
                    normalizeSubscriptionStatus(
                      organization.subscriptionStatus
                    ) as AdminNormalizedSubscriptionStatus;
                  const organizationIntervalLabel =
                    organization.subscriptionTemplateInterval
                      ? intervalLabels[
                          organization.subscriptionTemplateInterval as keyof typeof intervalLabels
                        ] || organization.subscriptionTemplateInterval
                      : null;
                  const organizationPlanMetaLabel = [
                    formatSubscriptionPrice({
                      priceCents: organization.subscriptionTemplatePriceCents,
                      currency: organization.subscriptionTemplateCurrency,
                      locale: dateLocale
                    }),
                    organizationIntervalLabel
                  ]
                    .filter(Boolean)
                    .join(' / ');

                  return (
                    <TableRow key={organization.teamId}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {organization.teamName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{organization.teamId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium capitalize text-foreground">
                          {organization.memberRole}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="text-sm text-foreground">
                            {organization.subscriptionTemplateName || t('Free (no template)')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {organizationPlanMetaLabel || t('No billing cycle')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className={getSubscriptionStatusClassName(organizationStatus)}>
                          {organization.subscriptionStatus || t('Free')}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        {organization.paymentProvider ? (
                          <span className={getPaymentProviderClassName(organization.paymentProvider)}>
                            {organization.paymentProvider}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('none')}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {formatDateTime(organization.joinedAt, dateLocale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
        title: t('User subscription template'),
        description: t('Update identity and user-level subscription assignment.'),
        userId: user.id
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
