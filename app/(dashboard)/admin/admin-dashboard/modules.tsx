import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  FileText,
  LayoutTemplate,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { formatDateTime } from '../utils';
import { ActivityVolumeChart } from './activity-volume-chart';
import {
  ADMIN_DASHBOARD_ENABLED_MODULES_ENV_KEY,
  ADMIN_DASHBOARD_MODULE_VISIBILITY
} from './config';
import type {
  AdminDashboardModuleId,
  AdminDashboardModuleProps
} from './types';
import { getEnabledAdminDashboardModuleWidgets } from '@/lib/modules/runtime';

type AdminDashboardModuleDefinition = {
  id: AdminDashboardModuleId;
  Component: ComponentType<AdminDashboardModuleProps>;
};

type OverviewMetric = {
  href: string;
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  toneClassName: string;
};

function formatCompactValue(value: number, locale: string) {
  if (Math.abs(value) < 1000) {
    return value.toLocaleString(locale);
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function ImpactMetricCard({
  metric,
  dateLocale
}: {
  metric: OverviewMetric;
  dateLocale: string;
}) {
  return (
    <Link href={metric.href} className="group block">
      <Card className="h-full border-border/70 bg-background/80 transition-colors hover:bg-accent/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {formatCompactValue(metric.value, dateLocale)}
              </p>
            </div>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border',
                metric.toneClassName
              )}
            >
              <metric.icon className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function OverviewModule({ messages, summary, dateLocale, activityChart }: AdminDashboardModuleProps) {
  const metrics: OverviewMetric[] = [
    {
      href: '/admin/users',
      label: messages.nav.users,
      value: summary.totalUsers,
      icon: Users,
      toneClassName: 'border-sky-500/30 bg-sky-500/12 text-sky-600'
    },
    {
      href: '/admin/suscriptions',
      label: messages.ordersPage.table.teamHeader,
      value: summary.totalTeams,
      icon: Building2,
      toneClassName: 'border-indigo-500/30 bg-indigo-500/12 text-indigo-600'
    },
    {
      href: '/admin/suscriptions',
      label: messages.billingPage.metrics.activeSubscriptions,
      value: summary.activeSubscriptions,
      icon: BadgeCheck,
      toneClassName: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600'
    },
    {
      href: '/admin/suscriptions',
      label: messages.billingPage.metrics.issueSubscriptions,
      value: summary.issueSubscriptions,
      icon: AlertCircle,
      toneClassName: 'border-amber-500/30 bg-amber-500/12 text-amber-600'
    },
    {
      href: '/admin/orders',
      label: messages.ordersPage.metrics.pendingOrders,
      value: summary.pendingOrders,
      icon: Clock3,
      toneClassName: 'border-violet-500/30 bg-violet-500/12 text-violet-600'
    },
    {
      href: '/admin/orders',
      label: messages.ordersPage.metrics.failedOrders,
      value: summary.failedOrders,
      icon: FileText,
      toneClassName: 'border-rose-500/30 bg-rose-500/12 text-rose-600'
    }
  ];

  const chartConfig = {
    users: {
      label: messages.dashboardHome.chart.users,
      color: 'hsl(var(--chart-1))'
    },
    subscriptions: {
      label: messages.dashboardHome.chart.subscriptions,
      color: 'hsl(var(--chart-2))'
    },
    sales: {
      label: messages.dashboardHome.chart.sales,
      color: 'hsl(var(--chart-5))'
    }
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <ImpactMetricCard key={metric.label} metric={metric} dateLocale={dateLocale} />
        ))}
      </div>

      <Card className="overflow-hidden border-border/70">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle>{messages.dashboardHome.chart.title}</CardTitle>
          <CardDescription>{messages.dashboardHome.chart.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <ActivityVolumeChart
            data={activityChart}
            dateLocale={dateLocale}
            config={chartConfig}
            labels={{
              salesHint: messages.dashboardHome.chart.salesHint,
              rangeFrom: messages.dashboardHome.chart.rangeFrom,
              rangeTo: messages.dashboardHome.chart.rangeTo,
              last7Days: messages.dashboardHome.chart.last7Days,
              last30Days: messages.dashboardHome.chart.last30Days,
              last90Days: messages.dashboardHome.chart.last90Days,
              resetRange: messages.dashboardHome.chart.resetRange
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLinksModule({ messages }: AdminDashboardModuleProps) {
  const links = [
    {
      href: '/admin/users',
      icon: Users,
      label: messages.nav.users,
      description: messages.usersPage.createDescription
    },
    {
      href: '/admin/suscriptions',
      icon: LayoutTemplate,
      label: messages.nav.subscriptions,
      description: messages.billingPage.description
    },
    {
      href: '/admin/payments',
      icon: ReceiptText,
      label: messages.nav.payments,
      description: messages.paymentsPage.description
    },
    {
      href: '/admin/orders',
      icon: ShoppingCart,
      label: messages.nav.orders,
      description: messages.ordersPage.description
    },
    {
      href: '/admin/logs',
      icon: FileText,
      label: messages.nav.logs,
      description: messages.logsPage.description
    },
    {
      href: '/admin/app-config',
      icon: Settings2,
      label: messages.nav.appConfig,
      description: messages.appConfig.description
    }
  ];

  return (
    <Card className="border-border/70">
      <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-3">
        {links.map((linkItem) => (
          <Link
            key={linkItem.href}
            href={linkItem.href}
            className="group rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background">
                <linkItem.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{linkItem.label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {linkItem.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function getActivityStatusLabel(status: string, props: AdminDashboardModuleProps) {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'success') {
    return props.messages.logsPage.table.success;
  }

  if (normalizedStatus === 'warning') {
    return props.messages.logsPage.table.warning;
  }

  if (normalizedStatus === 'failed') {
    return props.messages.logsPage.table.failed;
  }

  return props.messages.logsPage.table.info;
}

function getActivityStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600';
  }

  if (normalizedStatus === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600';
  }

  if (normalizedStatus === 'failed') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-600';
  }

  return 'border-slate-500/30 bg-slate-500/10 text-slate-600';
}

function RecentActivityModule(props: AdminDashboardModuleProps) {
  return (
    <Card className="max-w-4xl border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{props.messages.dashboardHome.recent.title}</CardTitle>
          <CardDescription>{props.messages.dashboardHome.recent.description}</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/logs">
            {props.messages.nav.logs}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {props.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">{props.messages.dataTable.noResults}</p>
        ) : (
          <ul className="space-y-2">
            {props.recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-border/70 bg-background/80 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{activity.eventType}</p>
                    <p className="truncate text-xs text-muted-foreground">{activity.message || '-'}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      getActivityStatusClassName(activity.status)
                    )}
                  >
                    {getActivityStatusLabel(activity.status, props)}
                  </span>
                  <p className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(activity.createdAt, props.dateLocale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const ADMIN_DASHBOARD_MODULE_IDS = [
  'overview',
  'quickLinks',
  'recentActivity'
] as const satisfies readonly AdminDashboardModuleId[];

function isAdminDashboardModuleId(value: string): value is AdminDashboardModuleId {
  return (ADMIN_DASHBOARD_MODULE_IDS as readonly string[]).includes(value);
}

function parseEnvEnabledModules(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new Set(
    value
      .split(',')
      .map((moduleId) => moduleId.trim())
      .filter(isAdminDashboardModuleId)
  );
}

const ADMIN_DASHBOARD_MODULE_REGISTRY: AdminDashboardModuleDefinition[] = [
  {
    id: 'overview',
    Component: OverviewModule
  },
  {
    id: 'quickLinks',
    Component: QuickLinksModule
  },
  {
    id: 'recentActivity',
    Component: RecentActivityModule
  }
];

export async function getEnabledAdminDashboardModules() {
  const envEnabledModules = parseEnvEnabledModules(
    process.env[ADMIN_DASHBOARD_ENABLED_MODULES_ENV_KEY]
  );

  const coreModules = ADMIN_DASHBOARD_MODULE_REGISTRY.filter((moduleItem) => {
    if (envEnabledModules) {
      return envEnabledModules.has(moduleItem.id);
    }

    return ADMIN_DASHBOARD_MODULE_VISIBILITY[moduleItem.id];
  });

  const widgets = await getEnabledAdminDashboardModuleWidgets();
  if (!widgets.length) {
    return coreModules;
  }

  const widgetModules = widgets.map((widget) => ({
    id: widget.id,
    Component: widget.Component as ComponentType<AdminDashboardModuleProps>
  }));

  return [...coreModules, ...widgetModules];
}
