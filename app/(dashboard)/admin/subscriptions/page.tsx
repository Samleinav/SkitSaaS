import Link from 'next/link';
import {
  AlertTriangle,
  Clock3,
  CircleCheck,
  CreditCard,
  LayoutTemplate,
  Users,
  type LucideIcon
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { Button } from '@/components/ui/button';
import {
  getAllTeamsForAdmin,
  getAllUsersForAdmin,
  getAdminSubscriptionTargetIdsWithOrders
} from '@/lib/db/queries.admin';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { cn } from '@/lib/utils';
import { requireAdminAccess } from '../guards';
import { formatDate, normalizeSubscriptionStatus } from '../utils';
import { type AdminSubscriptionRow } from './columns';
import { AdminSubscriptionsDataTable } from './subscriptions-data-table';
import { resolveAdminUserDisplayStatus } from '../users/status';
import { AdminUserSubscriptionsDataTable } from '../suscriptions/user-subscriptions-data-table';
import type { AdminUserSubscriptionRow } from '../suscriptions/user-subscriptions-columns';
import {
  createAdminSubscriptionsCopy,
  type AdminSubscriptionsCopy
} from './i18n';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ScopeFilter = 'user' | 'organization';

function resolveScopeFilter(
  value: string | string[] | undefined
): ScopeFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'user' ? 'user' : 'organization';
}

type ScopeHeaderProps = {
  scope: ScopeFilter;
  copy: AdminSubscriptionsCopy;
  description: string;
  createSubscriptionHref: string;
};

function ScopeHeader({
  scope,
  copy,
  description,
  createSubscriptionHref
}: ScopeHeaderProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/30">
      <div className="pointer-events-none absolute -top-20 -right-14 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-14 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
      <CardHeader className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="rounded-lg">
            <Link href={createSubscriptionHref}>{copy.newOrder}</Link>
          </Button>
          <div className="flex items-center rounded-xl border border-border/80 bg-background/70 p-1">
            <Button
              asChild
              size="sm"
              variant={scope === 'organization' ? 'default' : 'ghost'}
              className="rounded-lg"
            >
              <Link href="/admin/subscriptions">{copy.scopes.organization}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={scope === 'user' ? 'default' : 'ghost'}
              className="rounded-lg"
            >
              <Link href="/admin/subscriptions?scope=user">{copy.scopes.user}</Link>
            </Button>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link href="/admin/subscriptions/templates">
              <LayoutTemplate className="h-4 w-4" />
              {copy.templatesTitle}
            </Link>
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default'
}: MetricCardProps) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border',
              tone === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                : tone === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  : tone === 'danger'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                    : 'border-primary/20 bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const [[locale, t], resolvedSearchParams] = await Promise.all([
    Promise.all([getRequestLocale(), getServerTranslator({ area: 'admin' })]),
    searchParams
  ]);

  const scope = resolveScopeFilter(resolvedSearchParams.scope);
  const dateLocale = getDateLocale(locale);
  const copy = createAdminSubscriptionsCopy(t);
  const createSubscriptionHref =
    scope === 'user'
      ? '/admin/orders/create?targetType=user'
      : '/admin/orders/create?targetType=team';

  await requireAdminAccess();
  const themeSelection = await getThemeSelectionForArea('admin');

  if (scope === 'user') {
    const [users, subscriptionTargets] = await Promise.all([
      getAllUsersForAdmin(),
      getAdminSubscriptionTargetIdsWithOrders()
    ]);
    const userIdSet = new Set(subscriptionTargets.userIds);
    const rows: AdminUserSubscriptionRow[] = users
      .filter((user) => userIdSet.has(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: resolveAdminUserDisplayStatus({
          deletedAt: user.deletedAt,
          accountStatus: user.accountStatus
        }),
        subscriptionTemplateName: user.subscriptionTemplateName,
        organizationsCount: user.organizationsCount,
        ownedOrganizationsCount: user.ownedOrganizationsCount
      }));

    const activeUsers = rows.filter((row) => row.status === 'active').length;
    const usersWithSubscription = rows.filter((row) =>
      Boolean(row.subscriptionTemplateName)
    ).length;
    const metricsFallback = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={copy.userMetrics.totalUsers}
          value={rows.length}
          icon={Users}
        />
        <MetricCard
          label={copy.userMetrics.usersWithSubscription}
          value={usersWithSubscription}
          icon={CreditCard}
        />
        <MetricCard
          label={copy.userMetrics.activeUsers}
          value={activeUsers}
          icon={CircleCheck}
          tone="success"
        />
        <MetricCard
          label={copy.userMetrics.withoutSubscription}
          value={Math.max(0, rows.length - usersWithSubscription)}
          icon={AlertTriangle}
          tone="warning"
        />
      </div>
    );
    const metricsSlot = themeSelection?.themeKey ? (
      <ThemeCodeTemplate
        themeId={themeSelection.themeKey}
        id="section.admin.metrics-grid"
        data={{
          variant: 'suscriptions.user',
          columns: 4
        }}
        fallback={metricsFallback}
      >
        {metricsFallback}
      </ThemeCodeTemplate>
    ) : (
      metricsFallback
    );

    const fallbackPage = (
      <div className="space-y-6">
        <ScopeHeader
          scope={scope}
          copy={copy}
          description={copy.userDescription}
          createSubscriptionHref={createSubscriptionHref}
        />

        {metricsSlot}

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>{copy.scopes.user}</CardTitle>
            <CardDescription>{copy.userSectionDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminUserSubscriptionsDataTable
              data={rows}
              copy={copy}
              tableTemplate={{
                componentId: 'ui.table',
                area: 'admin'
              }}
            />
          </CardContent>
        </Card>
      </div>
    );

    if (!themeSelection?.themeKey) {
      return fallbackPage;
    }

    return (
      <ThemeCodeTemplate
        themeId={themeSelection.themeKey}
        id="page.admin.suscriptions"
        data={{
          title: copy.title,
          description: copy.userDescription,
          scope
        }}
        fallback={fallbackPage}
      >
        {fallbackPage}
      </ThemeCodeTemplate>
    );
  }

  const [allTeams, subscriptionTargets] = await Promise.all([
    getAllTeamsForAdmin(),
    getAdminSubscriptionTargetIdsWithOrders()
  ]);
  const teamIdSet = new Set(subscriptionTargets.teamIds);
  const teamsWithOrders = allTeams.filter((team) => teamIdSet.has(team.id));

  const data: AdminSubscriptionRow[] = teamsWithOrders.map((team) => {
    const providerReferenceId = team.providerReferenceId ?? null;
    return {
      id: team.id,
      name: team.name,
      createdAt: team.createdAt.getTime(),
      createdAtLabel: formatDate(team.createdAt, dateLocale),
      membersCount: team.membersCount,
      paymentProvider: team.paymentProvider,
      subscriptionStatus:
        normalizeSubscriptionStatus(
          team.subscriptionStatus
        ) as AdminSubscriptionRow['subscriptionStatus'],
      planName: team.planName || copy.organizationTable.free,
      subscriptionTemplateId: team.subscriptionTemplateId,
      stripeSubscriptionId:
        team.paymentProvider === 'stripe' ? providerReferenceId : null,
      paypalSubscriptionId:
        team.paymentProvider === 'paypal' ? providerReferenceId : null
    };
  });

  const payingTeams = data.filter((team) => Boolean(team.paymentProvider)).length;
  const activeSubscriptions = data.filter(
    (team) => team.subscriptionStatus === 'active'
  ).length;
  const trialingSubscriptions = data.filter(
    (team) => team.subscriptionStatus === 'trialing'
  ).length;
  const issueSubscriptions = data.filter(
    (team) =>
      team.subscriptionStatus === 'unpaid' || team.subscriptionStatus === 'canceled'
  ).length;
  const metricsFallback = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label={copy.organizationMetrics.payingTeams}
        value={payingTeams}
        hint={copy.organizationMetrics.payingTeamsHint}
        icon={CreditCard}
      />
      <MetricCard
        label={copy.organizationMetrics.activeSubscriptions}
        value={activeSubscriptions}
        icon={CircleCheck}
        tone="success"
      />
      <MetricCard
        label={copy.organizationMetrics.trialingSubscriptions}
        value={trialingSubscriptions}
        icon={Clock3}
        tone="warning"
      />
      <MetricCard
        label={copy.organizationMetrics.issueSubscriptions}
        value={issueSubscriptions}
        icon={AlertTriangle}
        tone="danger"
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.metrics-grid"
      data={{
        variant: 'suscriptions.organization',
        columns: 4
      }}
      fallback={metricsFallback}
    >
      {metricsFallback}
    </ThemeCodeTemplate>
  ) : (
    metricsFallback
  );

  const fallbackPage = (
    <div className="space-y-6">
      <ScopeHeader
        scope={scope}
        copy={copy}
        description={copy.organizationDescription}
        createSubscriptionHref={createSubscriptionHref}
      />

      {metricsSlot}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{copy.scopes.organization}</CardTitle>
          <CardDescription>{copy.organizationDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSubscriptionsDataTable
            data={data}
            copy={copy}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'admin'
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.suscriptions"
      data={{
        title: copy.title,
        description: copy.organizationDescription,
        scope
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
