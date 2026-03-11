import { mergeClassNames, toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import {
  ArrowUpRight,
  BarChart3,
  Ban,
  CircleAlert,
  CreditCard,
  Link2,
  ShieldCheck,
  Users,
  type LucideIcon
} from 'lucide-react';
import {
  Children,
  isValidElement,
  type ReactNode
} from 'react';
import type { TemplateProps } from '../template-types';

type ExtractedMetric = {
  label: string;
  value: number;
};

type UserMetricCard = {
  key: string;
  title: string;
  value: number;
  icon: LucideIcon;
  badge: string;
  badgeToneClassName: string;
  footer: string;
};

function extractMetrics(node: ReactNode, metrics: ExtractedMetric[] = []): ExtractedMetric[] {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const props = child.props as {
      label?: unknown;
      value?: unknown;
      children?: ReactNode;
    };

    if (typeof props.label === 'string') {
      metrics.push({
        label: props.label,
        value: toNumberOrFallback(props.value, 0)
      });
    }

    if (props.children) {
      extractMetrics(props.children, metrics);
    }
  });

  return metrics;
}

function asUsersLabel(label: string | undefined, fallback: string) {
  if (!label) {
    return fallback;
  }

  return /user/i.test(label) ? label : `${label} users`;
}

function percentageOf(value: number, total: number) {
  if (total <= 0) {
    return '0%';
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatMetricValue(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function SectionAdminMetricsGridTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const columns = toNumberOrFallback(data?.columns, 4);
  const variant = toStringOrFallback(data?.variant, 'default');
  const columnClassName =
    columns >= 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-2 xl:grid-cols-3'
        : columns === 2
          ? 'sm:grid-cols-2'
          : 'sm:grid-cols-1';
  const isUsersVariant = variant === 'users';
  const isPaymentsVariant = variant === 'payments';
  const isSubscriptionsVariant =
    variant === 'suscriptions.organization' || variant === 'suscriptions.user';
  const childGridClassName = columnClassName
    .split(' ')
    .map((token) => `[&>div]:${token}`)
    .join(' ');

  if (isUsersVariant) {
    const extractedMetrics = extractMetrics(children);

    if (extractedMetrics.length >= 3) {
      const [activeMetric, suspendedMetric, bannedMetric] = extractedMetrics;
      const activeUsers = activeMetric?.value ?? 0;
      const suspendedUsers = suspendedMetric?.value ?? 0;
      const bannedUsers = bannedMetric?.value ?? 0;
      const totalUsers = activeUsers + suspendedUsers + bannedUsers;
      const activeShare = percentageOf(activeUsers, totalUsers);
      const suspendedShare = percentageOf(suspendedUsers, totalUsers);
      const bannedShare = percentageOf(bannedUsers, totalUsers);

      const userCards: UserMetricCard[] = [
        {
          key: 'total',
          title: 'Total users',
          value: totalUsers,
          icon: Users,
          badge: `${activeShare} active`,
          badgeToneClassName:
            'border-sky-500/25 bg-sky-500/10 text-sky-200',
          footer:
            totalUsers > 0
              ? `${formatMetricValue(activeUsers)} active, ${formatMetricValue(suspendedUsers)} suspended, ${formatMetricValue(bannedUsers)} banned`
              : 'No user accounts registered yet.'
        },
        {
          key: 'active',
          title: asUsersLabel(activeMetric?.label, 'Active users'),
          value: activeUsers,
          icon: ShieldCheck,
          badge: `${activeShare} share`,
          badgeToneClassName:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
          footer:
            activeUsers > 0
              ? `${formatMetricValue(activeUsers)} accounts currently have access`
              : 'No active accounts at the moment.'
        },
        {
          key: 'suspended',
          title: asUsersLabel(suspendedMetric?.label, 'Suspended users'),
          value: suspendedUsers,
          icon: CircleAlert,
          badge: `${suspendedShare} review`,
          badgeToneClassName:
            'border-amber-500/25 bg-amber-500/10 text-amber-200',
          footer:
            suspendedUsers > 0
              ? `${formatMetricValue(suspendedUsers)} accounts require operational follow-up`
              : 'No suspended accounts require review.'
        },
        {
          key: 'banned',
          title: asUsersLabel(bannedMetric?.label, 'Banned users'),
          value: bannedUsers,
          icon: Ban,
          badge: `${bannedShare} blocked`,
          badgeToneClassName:
            'border-rose-500/25 bg-rose-500/10 text-rose-200',
          footer:
            bannedUsers > 0
              ? `${formatMetricValue(bannedUsers)} accounts are blocked from access`
              : 'No banned accounts are present.'
        }
      ];

      return (
        <section
          className={mergeClassNames(
            '@container/metrics max-w-none',
            className
          )}
          data-metrics-columns={4}
          data-metrics-variant={variant}
          data-nexus-metrics-grid="users-rich"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {userCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.key}
                  data-slot="card"
                  className="rounded-[1.35rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-0 shadow-[0_18px_38px_-32px_rgba(0,0,0,0.82)]"
                >
                  <div
                    data-slot="card-content"
                    className="space-y-4 px-5 py-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/55 bg-background/72 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        data-slot="badge"
                        className={mergeClassNames(
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
                          card.badgeToneClassName
                        )}
                      >
                        {card.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-foreground tabular-nums">
                        {formatMetricValue(card.value)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="line-clamp-2">{card.footer}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground/55" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }
  }

  if (isPaymentsVariant) {
    const extractedMetrics = extractMetrics(children);

    if (extractedMetrics.length >= 4) {
      const [totalMetric, stripeMetric, paypalMetric, missingMetric] =
        extractedMetrics;
      const totalPayments = totalMetric?.value ?? 0;
      const providerBackedPayments =
        (stripeMetric?.value ?? 0) + (paypalMetric?.value ?? 0);
      const missingReferencePayments = missingMetric?.value ?? 0;
      const referencedPayments = Math.max(
        0,
        totalPayments - missingReferencePayments
      );
      const referenceCoverage = percentageOf(
        referencedPayments,
        totalPayments
      );

      const paymentCards: UserMetricCard[] = [
        {
          key: 'total',
          title: 'Payments recorded',
          value: totalPayments,
          icon: CreditCard,
          badge: `${referenceCoverage} ready`,
          badgeToneClassName:
            'border-sky-500/25 bg-sky-500/10 text-sky-200',
          footer:
            totalPayments > 0
              ? `${formatMetricValue(referencedPayments)} payments already include a payment reference`
              : 'No settled payments available yet.'
        },
        {
          key: 'provider-backed',
          title: 'Provider-linked payments',
          value: providerBackedPayments,
          icon: Link2,
          badge: `${percentageOf(providerBackedPayments, totalPayments)} linked`,
          badgeToneClassName:
            'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
          footer:
            providerBackedPayments > 0
              ? `${formatMetricValue(providerBackedPayments)} records are attached to a connected payment rail`
              : 'No provider-linked payment records found.'
        },
        {
          key: 'referenced',
          title: 'Reconciliation ready',
          value: referencedPayments,
          icon: BarChart3,
          badge: `${referenceCoverage} coverage`,
          badgeToneClassName:
            'border-violet-500/25 bg-violet-500/10 text-violet-200',
          footer:
            referencedPayments > 0
              ? `${formatMetricValue(referencedPayments)} payments can be matched without manual lookup`
              : 'No payments are ready for reconciliation yet.'
        },
        {
          key: 'review',
          title: 'Needs review',
          value: missingReferencePayments,
          icon: CircleAlert,
          badge: `${percentageOf(missingReferencePayments, totalPayments)} gap`,
          badgeToneClassName:
            'border-amber-500/25 bg-amber-500/10 text-amber-200',
          footer:
            missingReferencePayments > 0
              ? `${formatMetricValue(missingReferencePayments)} payments are missing a payment reference`
              : 'Reference hygiene is clean across the current payment set.'
        }
      ];

      return (
        <section
          className={mergeClassNames(
            '@container/metrics max-w-none',
            className
          )}
          data-metrics-columns={4}
          data-metrics-variant={variant}
          data-nexus-metrics-grid="payments-rich"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {paymentCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.key}
                  data-slot="card"
                  className="rounded-[1.35rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-0 shadow-[0_18px_38px_-32px_rgba(0,0,0,0.82)]"
                >
                  <div data-slot="card-content" className="space-y-4 px-5 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/55 bg-background/72 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        data-slot="badge"
                        className={mergeClassNames(
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
                          card.badgeToneClassName
                        )}
                      >
                        {card.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-foreground tabular-nums">
                        {formatMetricValue(card.value)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="line-clamp-2">{card.footer}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground/55" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }
  }

  return (
    <section
      className={mergeClassNames(
        '@container/metrics',
        '[&>div]:grid',
        childGridClassName,
        // Apply gradient styling to any descendant card (works even when cards
        // are wrapped in the page's own grid div passed as children)
        '[&_[data-slot=card]]:from-primary/5 [&_[data-slot=card]]:to-card',
        'dark:[&_[data-slot=card]]:bg-card [&_[data-slot=card]]:bg-gradient-to-t',
        '[&_[data-slot=card]]:shadow-sm',
        isSubscriptionsVariant
          ? mergeClassNames(
              '[&>div]:gap-3.5',
              '[&_[data-slot=card]]:gap-0',
              '[&_[data-slot=card]]:rounded-[1.35rem]',
              '[&_[data-slot=card]]:border-border/60',
              '[&_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.2)_100%)]',
              '[&_[data-slot=card]]:py-0',
              '[&_[data-slot=card]]:shadow-[0_18px_38px_-32px_rgba(0,0,0,0.8)]',
              '[&_[data-slot=card-header]]:px-5',
              '[&_[data-slot=card-header]]:pt-4',
              '[&_[data-slot=card-header]]:pb-0',
              '[&_[data-slot=card-header]>div]:flex',
              '[&_[data-slot=card-header]>div]:items-start',
              '[&_[data-slot=card-header]>div]:justify-between',
              '[&_[data-slot=card-header]>div]:gap-3',
              '[&_[data-slot=card-header]>div>span]:h-8',
              '[&_[data-slot=card-header]>div>span]:w-8',
              '[&_[data-slot=card-header]>div>span]:rounded-lg',
              '[&_[data-slot=card-header]>div>span]:shadow-none',
              '[&_[data-slot=card-description]]:text-[13px]',
              '[&_[data-slot=card-description]]:font-medium',
              '[&_[data-slot=card-description]]:tracking-[-0.01em]',
              '[&_[data-slot=card-description]]:text-foreground/86',
              '[&_[data-slot=card-content]]:space-y-2',
              '[&_[data-slot=card-content]]:px-5',
              '[&_[data-slot=card-content]]:pt-4',
              '[&_[data-slot=card-content]]:pb-4',
              '[&_[data-slot=card-content]>p:first-child]:text-[2rem]',
              '[&_[data-slot=card-content]>p:first-child]:font-semibold',
              '[&_[data-slot=card-content]>p:first-child]:leading-none',
              '[&_[data-slot=card-content]>p:first-child]:tracking-[-0.04em]',
              '[&_[data-slot=card-content]>p:first-child]:tabular-nums',
              '[&_[data-slot=card-content]>p:last-child]:text-[12px]',
              '[&_[data-slot=card-content]>p:last-child]:leading-5',
              '[&_[data-slot=card-content]>p:last-child]:text-muted-foreground'
            )
          : null,
        className
      )}
      data-metrics-columns={columns}
      data-metrics-variant={variant}
      data-nexus-metrics-grid="modern"
    >
      {children}
    </section>
  );
}
