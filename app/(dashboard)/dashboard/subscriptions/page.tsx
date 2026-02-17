import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TemplateAsyncSubmitButton } from '@/components/ui/template-async-submit-button';
import { TemplateConfirmSubmitButton } from '@/components/ui/template-confirm-submit-button';
import { TemplateTable } from '@/components/ui/template-table';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getCurrentUserSubscriptionManagementData } from '@/lib/db/queries';
import { getOrganizationLimits } from '@/lib/organizations/config';
import { getCurrentUserOrganizationLimitBySubscription } from '@/lib/organizations/subscription-limits';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import {
  cancelUserSubscriptionAction,
  manageOrganizationSubscriptionAction
} from './actions';
import {
  DashboardSubscriptionPaymentsDataTable,
  type DashboardSubscriptionPaymentRow
} from './payments-data-table';
import {
  DashboardSubscriptionInvoicesDataTable,
  type DashboardSubscriptionInvoiceRow
} from './invoices-data-table';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parsePositiveInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatMoney(
  amountInCents: number | null,
  currency: string | null,
  locale: string
) {
  if (amountInCents === null || !currency) {
    return '-';
  }

  const normalizedCurrency = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency
    }).format(amountInCents / 100);
  } catch {
    return `${(amountInCents / 100).toFixed(2)} ${normalizedCurrency}`;
  }
}

function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(value);
}

function normalizeSubscriptionStatus(value: string | null) {
  if (
    value === 'active' ||
    value === 'trialing' ||
    value === 'unpaid' ||
    value === 'canceled' ||
    value === 'free'
  ) {
    return value;
  }

  return 'free';
}

function normalizeOrderStatus(value: string | null) {
  if (
    value === 'pending' ||
    value === 'received' ||
    value === 'canceled' ||
    value === 'failed'
  ) {
    return value;
  }

  return 'pending';
}

function getStatusClassName(status: string) {
  if (status === 'active' || status === 'received') {
    return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
  }

  if (status === 'trialing' || status === 'pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (status === 'unpaid' || status === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function resolveEffectiveLimit({
  allowMultiOrganizations,
  maxByConfig,
  maxBySubscription
}: {
  allowMultiOrganizations: boolean;
  maxByConfig: number | null;
  maxBySubscription: number | null;
}) {
  if (!allowMultiOrganizations) {
    return 1;
  }

  if (maxByConfig === null && maxBySubscription === null) {
    return null;
  }

  if (maxByConfig === null) {
    return maxBySubscription;
  }

  if (maxBySubscription === null) {
    return maxByConfig;
  }

  return Math.min(maxByConfig, maxBySubscription);
}

function formatLimit(value: number | null, unlimitedLabel: string) {
  if (value === null) {
    return unlimitedLabel;
  }

  return String(value);
}

function formatRole(
  role: string,
  labels: {
    owner: string;
    member: string;
  }
) {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === 'owner') {
    return labels.owner;
  }

  if (normalizedRole === 'member') {
    return labels.member;
  }

  return role;
}

function formatInterval(
  value: string | null,
  labels: Record<string, string>
) {
  if (!value) {
    return '-';
  }

  return labels[value] || value;
}

export default async function DashboardSubscriptionsPage({
  searchParams
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const [{ locale, messages }, subscriptionData, organizationLimits, subscriptionOrgLimit] =
    await Promise.all([
      getServerLocaleAndMessages('dashboard'),
      getCurrentUserSubscriptionManagementData(),
      getOrganizationLimits(),
      getCurrentUserOrganizationLimitBySubscription()
    ]);

  if (!subscriptionData) {
    redirect('/login');
  }

  const subscriptions = messages.subscriptions;
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
  const themeSelection = await getThemeSelectionForArea('dashboard');
  const requestedTeamId = parsePositiveInt(
    getFirstSearchParam(resolvedSearchParams.teamId)
  );
  const selectedMembership =
    requestedTeamId === null
      ? null
      : subscriptionData.memberships.find(
          (membership) => membership.teamId === requestedTeamId
        ) || null;
  const selectedTeamId = selectedMembership?.teamId || null;

  const filteredMemberships =
    selectedMembership ? [selectedMembership] : subscriptionData.memberships;
  const filteredOrders = selectedTeamId
    ? subscriptionData.orders.filter(
        (order) =>
          order.scopeType === 'team' && order.scopeTeamId === selectedTeamId
      )
    : subscriptionData.orders;
  const filteredInvoices = filteredOrders.filter(
    (order) =>
      normalizeOrderStatus(order.status) === 'received' &&
      (order.provider === 'stripe' || order.provider === 'paypal')
  );

  const paymentRows: DashboardSubscriptionPaymentRow[] = filteredOrders.map(
    (order) => {
      const orderStatus = normalizeOrderStatus(order.status);
      const scopeLabel =
        order.scopeType === 'team'
          ? order.teamName || (order.scopeTeamId ? `team:${order.scopeTeamId}` : '-')
          : order.scopeType === 'user'
            ? `${subscriptions.logs.accountScope} (${subscriptionData.user.email})`
            : subscriptions.logs.unknownScope;

      return {
        id: order.id,
        updatedAt: order.updatedAt.getTime(),
        updatedAtLabel: formatDateTime(order.updatedAt, dateLocale),
        scopeLabel,
        provider: order.provider,
        status: orderStatus,
        statusLabel: subscriptions.statuses[orderStatus],
        eventType: order.eventType,
        amountLabel: formatMoney(order.amount, order.currency, dateLocale),
        externalPaymentId: order.externalPaymentId || '-',
        externalOrderId: order.externalOrderId || '-'
      };
    }
  );

  const invoiceRows: DashboardSubscriptionInvoiceRow[] = filteredInvoices.map(
    (invoice) => {
      const scopeLabel =
        invoice.scopeType === 'team'
          ? invoice.teamName ||
            (invoice.scopeTeamId ? `team:${invoice.scopeTeamId}` : '-')
          : `${subscriptions.logs.accountScope} (${subscriptionData.user.email})`;

      return {
        id: invoice.id,
        updatedAt: invoice.updatedAt.getTime(),
        updatedAtLabel: formatDateTime(invoice.updatedAt, dateLocale),
        scopeLabel,
        planLabel: invoice.planName || invoice.templateName || '-',
        provider: invoice.provider,
        amountLabel: formatMoney(invoice.amount, invoice.currency, dateLocale),
        reference:
          invoice.externalPaymentId ||
          invoice.externalOrderId ||
          `order:${invoice.id}`
      };
    }
  );

  const effectiveOrganizationLimit = resolveEffectiveLimit({
    allowMultiOrganizations: organizationLimits.allowMultiOrganizations,
    maxByConfig: organizationLimits.maxOrganizationsPerUser,
    maxBySubscription: subscriptionOrgLimit
  });
  const resolveOrganizationsTableCellSlot = ({
    slot,
    data,
    fallback
  }: {
    slot: string;
    data?: Record<string, unknown>;
    fallback: ReactNode;
  }) => {
    if (!themeSelection?.themeKey) {
      return fallback;
    }

    return (
      <ThemeCodeTemplate
        id="section.dashboard.table.subscriptions.organizations.cell"
        themeId={themeSelection.themeKey}
        data={{
          slot,
          ...(data ?? {})
        }}
        fallback={fallback}
      >
        {fallback}
      </ThemeCodeTemplate>
    );
  };

  const fallbackPage = (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-lg font-medium text-foreground lg:text-2xl">
          {subscriptions.title}
        </h1>
        <p className="text-sm text-muted-foreground">{subscriptions.description}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{subscriptions.summary.organizations}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {filteredMemberships.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{subscriptions.summary.paymentEvents}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {filteredOrders.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{subscriptions.summary.invoices}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {filteredInvoices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{subscriptions.teamFilter.title}</CardTitle>
          <CardDescription>
            {selectedMembership
              ? subscriptions.teamFilter.selected
                  .replace('{team}', selectedMembership.teamName)
              : subscriptions.teamFilter.allDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionData.memberships.length > 0 ? (
            <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-2 sm:min-w-[300px]">
                <Label htmlFor="team-filter">{subscriptions.teamFilter.label}</Label>
                <select
                  id="team-filter"
                  name="teamId"
                  defaultValue={selectedTeamId ? String(selectedTeamId) : 'all'}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">{subscriptions.teamFilter.allTeams}</option>
                  {subscriptionData.memberships.map((membership) => (
                    <option key={membership.teamId} value={membership.teamId}>
                      {membership.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <TemplateAsyncSubmitButton
                  area="dashboard"
                  route="/dashboard/subscriptions"
                  idleLabel={subscriptions.teamFilter.apply}
                />
                {selectedMembership ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/subscriptions">
                      {subscriptions.teamFilter.clear}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              {subscriptions.organizations.empty}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{subscriptions.userPlan.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscriptionData.user.subscriptionTemplateId ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  {subscriptions.userPlan.activeSubscription}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {subscriptions.userPlan.plan}:{' '}
                    <span className="text-foreground">
                      {subscriptionData.user.subscriptionTemplateName || '-'}
                    </span>
                  </p>
                  <p>
                    {subscriptions.userPlan.interval}:{' '}
                    <span className="text-foreground">
                      {formatInterval(
                        subscriptionData.user.subscriptionTemplateInterval,
                        subscriptions.intervals
                      )}
                    </span>
                  </p>
                  <p>
                    {subscriptions.userPlan.amount}:{' '}
                    <span className="text-foreground">
                      {formatMoney(
                        subscriptionData.user.subscriptionTemplatePriceCents,
                        subscriptionData.user.subscriptionTemplateCurrency,
                        dateLocale
                      )}
                    </span>
                  </p>
                  <p>
                    {subscriptions.userPlan.source}:{' '}
                    <span className="text-foreground">
                      {subscriptions.userPlan.sourceManual}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-3 sm:flex-row">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/pricing?changeMode=period_end">
                      {subscriptions.userPlan.changePlanPeriodEnd}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/pricing?changeMode=immediate">
                      {subscriptions.userPlan.changePlanImmediate}
                    </Link>
                  </Button>
                </div>
                <form id="cancel-user-subscription" action={cancelUserSubscriptionAction}>
                  <TemplateConfirmSubmitButton
                    area="dashboard"
                    route="/dashboard/subscriptions"
                    formId="cancel-user-subscription"
                    title={subscriptions.userPlan.confirmCancelTitle}
                    description={subscriptions.userPlan.confirmCancelDescription}
                    triggerLabel={subscriptions.userPlan.cancel}
                    confirmLabel={subscriptions.userPlan.confirmCancel}
                    cancelLabel={subscriptions.userPlan.keep}
                    triggerVariant="destructive"
                    triggerSize="default"
                  />
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {subscriptions.userPlan.noSubscription}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{subscriptions.organizationPolicy.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              {subscriptions.organizationPolicy.allowMultiOrganizations}:{' '}
              <span className="text-foreground">
                {organizationLimits.allowMultiOrganizations
                  ? subscriptions.organizationPolicy.yes
                  : subscriptions.organizationPolicy.no}
              </span>
            </p>
            <p>
              {subscriptions.organizationPolicy.maxByConfig}:{' '}
              <span className="text-foreground">
                {formatLimit(
                  organizationLimits.maxOrganizationsPerUser,
                  subscriptions.organizationPolicy.unlimited
                )}
              </span>
            </p>
            <p>
              {subscriptions.organizationPolicy.maxBySubscription}:{' '}
              <span className="text-foreground">
                {formatLimit(
                  subscriptionOrgLimit,
                  subscriptions.organizationPolicy.unlimited
                )}
              </span>
            </p>
            <p>
              {subscriptions.organizationPolicy.effectiveLimit}:{' '}
              <span className="text-foreground">
                {formatLimit(
                  effectiveOrganizationLimit,
                  subscriptions.organizationPolicy.unlimited
                )}
              </span>
            </p>
            <p>
              {subscriptions.organizationPolicy.currentOrganizations}:{' '}
              <span className="text-foreground">
                {subscriptionData.memberships.length}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{subscriptions.organizations.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {subscriptions.organizations.empty}
            </p>
          ) : (
            <TemplateTable area="dashboard" route="/dashboard/subscriptions">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.organization',
                      fallback: <>{subscriptions.organizations.columns.organization}</>
                    })}
                  </TableHead>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.role',
                      fallback: <>{subscriptions.organizations.columns.role}</>
                    })}
                  </TableHead>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.plan',
                      fallback: <>{subscriptions.organizations.columns.plan}</>
                    })}
                  </TableHead>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.provider',
                      fallback: <>{subscriptions.organizations.columns.provider}</>
                    })}
                  </TableHead>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.status',
                      fallback: <>{subscriptions.organizations.columns.status}</>
                    })}
                  </TableHead>
                  <TableHead>
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.joined-at',
                      fallback: <>{subscriptions.organizations.columns.joinedAt}</>
                    })}
                  </TableHead>
                  <TableHead className="text-right">
                    {resolveOrganizationsTableCellSlot({
                      slot: 'header.actions',
                      fallback: <>{subscriptions.organizations.columns.actions}</>
                    })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMemberships.map((membership) => {
                  const subscriptionStatus = normalizeSubscriptionStatus(
                    membership.subscriptionStatus
                  );
                  const isOwner = membership.memberRole.toLowerCase() === 'owner';
                  const teamPlanLabel =
                    membership.subscriptionTemplateName ||
                    membership.planName ||
                    subscriptions.organizations.noPlan;

                  return (
                    <TableRow key={membership.teamId}>
                      <TableCell className="font-medium">
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.organization',
                          data: {
                            teamId: membership.teamId
                          },
                          fallback: <>{membership.teamName}</>
                        })}
                      </TableCell>
                      <TableCell>
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.role',
                          data: {
                            teamId: membership.teamId,
                            role: membership.memberRole
                          },
                          fallback: (
                            <>
                              {formatRole(membership.memberRole, {
                                owner: subscriptions.organizations.owner,
                                member: subscriptions.organizations.member
                              })}
                            </>
                          )
                        })}
                      </TableCell>
                      <TableCell>
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.plan',
                          data: {
                            teamId: membership.teamId
                          },
                          fallback: <>{teamPlanLabel}</>
                        })}
                      </TableCell>
                      <TableCell>
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.provider',
                          data: {
                            teamId: membership.teamId,
                            provider: membership.paymentProvider
                          },
                          fallback: (
                            <>
                              {membership.paymentProvider ||
                                subscriptions.organizations.noProvider}
                            </>
                          )
                        })}
                      </TableCell>
                      <TableCell>
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.status',
                          data: {
                            teamId: membership.teamId,
                            status: subscriptionStatus
                          },
                          fallback: (
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                                getStatusClassName(subscriptionStatus)
                              )}
                            >
                              {
                                subscriptions.statuses[
                                  subscriptionStatus as keyof typeof subscriptions.statuses
                                ]
                              }
                            </span>
                          )
                        })}
                      </TableCell>
                      <TableCell>
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.joined-at',
                          data: {
                            teamId: membership.teamId
                          },
                          fallback: <>{formatDate(membership.joinedAt, dateLocale)}</>
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {resolveOrganizationsTableCellSlot({
                          slot: 'cell.actions',
                          data: {
                            teamId: membership.teamId,
                            isOwner,
                            provider: membership.paymentProvider
                          },
                          fallback: !isOwner ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-col items-end gap-2">
                              {membership.paymentProvider === 'stripe' ? (
                                <form action={manageOrganizationSubscriptionAction}>
                                  <input
                                    type="hidden"
                                    name="teamId"
                                    value={membership.teamId}
                                  />
                                  <TemplateAsyncSubmitButton
                                    area="dashboard"
                                    route="/dashboard/subscriptions"
                                    size="sm"
                                    variant="outline"
                                    idleLabel={subscriptions.organizations.manage}
                                    pendingLabel={subscriptions.organizations.managePending}
                                  />
                                </form>
                              ) : membership.paymentProvider === 'paypal' ? (
                                <form
                                  id={`cancel-paypal-subscription-${membership.teamId}`}
                                  action={manageOrganizationSubscriptionAction}
                                  className="inline-flex"
                                >
                                  <input
                                    type="hidden"
                                    name="teamId"
                                    value={membership.teamId}
                                  />
                                  <TemplateConfirmSubmitButton
                                    area="dashboard"
                                    route="/dashboard/subscriptions"
                                    formId={`cancel-paypal-subscription-${membership.teamId}`}
                                    title={subscriptions.organizations.confirmCancelTitle}
                                    description={subscriptions.organizations.confirmCancelDescription}
                                    triggerLabel={subscriptions.organizations.cancelPaypal}
                                    confirmLabel={subscriptions.organizations.confirmCancel}
                                    cancelLabel={subscriptions.organizations.keep}
                                    triggerVariant="outline"
                                  />
                                </form>
                              ) : null}
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button asChild variant="ghost" size="sm">
                                  <Link href="/pricing?changeMode=period_end">
                                    {subscriptions.organizations.changePlanPeriodEnd}
                                  </Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                  <Link href="/pricing?changeMode=immediate">
                                    {subscriptions.organizations.changePlanImmediate}
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TemplateTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{subscriptions.logs.title}</CardTitle>
          <CardDescription>{subscriptions.logs.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardSubscriptionPaymentsDataTable
            data={paymentRows}
            labels={{
              filterPlaceholder: subscriptions.logs.filterPlaceholder,
              empty: subscriptions.logs.empty,
              columns: subscriptions.logs.columns,
              table: subscriptions.table
            }}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'dashboard',
              themeId: themeSelection?.themeKey ?? null
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{subscriptions.invoices.title}</CardTitle>
          <CardDescription>{subscriptions.invoices.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardSubscriptionInvoicesDataTable
            data={invoiceRows}
            labels={{
              filterPlaceholder: subscriptions.invoices.filterPlaceholder,
              empty: subscriptions.invoices.empty,
              columns: subscriptions.invoices.columns,
              table: subscriptions.table
            }}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'dashboard',
              themeId: themeSelection?.themeKey ?? null
            }}
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
      id="page.dashboard.subscriptions"
      themeId={themeSelection.themeKey}
      data={{
        title: subscriptions.title,
        description: subscriptions.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
