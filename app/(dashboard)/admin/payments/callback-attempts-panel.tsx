import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AdminMetricCard } from '../admin-page-shell';
import { formatDateTime } from '../utils';
import type { AdminPaymentsCopy } from './i18n';
import {
  getCheckoutCallbackMetrics,
  getCheckoutCallbackOutcome,
  type AdminCheckoutCallbackAttemptRow,
  type CheckoutCallbackOutcome
} from './callback-attempts';

function getOutcomeLabel(
  outcome: CheckoutCallbackOutcome,
  copy: AdminPaymentsCopy['callbackSummary']
) {
  if (outcome === 'unknown') {
    return copy.unknown;
  }

  if (outcome === 'replayed') {
    return copy.replayed;
  }

  if (outcome === 'provider_pending') {
    return copy.providerPending;
  }

  if (outcome === 'failed') {
    return copy.failed;
  }

  if (outcome === 'ignored') {
    return copy.ignored;
  }

  return copy.succeeded;
}

function getOutcomeClasses(outcome: CheckoutCallbackOutcome) {
  if (outcome === 'unknown') {
    return 'border-muted-foreground/20 bg-muted/60 text-muted-foreground';
  }

  if (outcome === 'replayed') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }

  if (outcome === 'provider_pending') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (outcome === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  if (outcome === 'ignored') {
    return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }

  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

function getTargetLabel(
  row: AdminCheckoutCallbackAttemptRow,
  copy: AdminPaymentsCopy['callbackSummary']
) {
  if (row.targetType === 'team') {
    return row.teamName || (row.targetTeamId ? `team:${row.targetTeamId}` : copy.unknownTarget);
  }

  if (row.targetType === 'user') {
    return row.targetUserId ? `user:${row.targetUserId}` : copy.unknownTarget;
  }

  return row.teamName || (row.teamId ? `team:${row.teamId}` : copy.unknownTarget);
}

function getOwnerLabel(
  row: AdminCheckoutCallbackAttemptRow,
  copy: AdminPaymentsCopy['callbackSummary']
) {
  const owner =
    row.ownerType === 'core'
      ? copy.ownerCore
      : row.ownerType === 'module'
        ? copy.ownerModule
        : copy.ownerUnknown;

  if (row.ownerType === 'module' && row.moduleId) {
    return `${owner}:${row.moduleId}`;
  }

  return owner;
}

function getOrderTypeLabel(
  row: AdminCheckoutCallbackAttemptRow,
  copy: AdminPaymentsCopy['callbackSummary']
) {
  if (row.orderType === 'one_time') {
    return copy.orderTypeOneTime;
  }

  if (row.orderType === 'subscription') {
    return copy.orderTypeSubscription;
  }

  return copy.unknown;
}

function getProviderIdsLabel(
  row: AdminCheckoutCallbackAttemptRow,
  copy: AdminPaymentsCopy['callbackSummary']
) {
  const values = [
    row.providerReferenceId,
    row.providerSessionId,
    row.externalPaymentId,
    row.externalOrderId
  ].filter((value): value is string => Boolean(value));

  if (values.length === 0) {
    return copy.none;
  }

  return values.join(' / ');
}

export function AdminCheckoutCallbackAttemptsPanel({
  rows,
  copy,
  dateLocale
}: {
  rows: AdminCheckoutCallbackAttemptRow[];
  copy: AdminPaymentsCopy;
  dateLocale: string;
}) {
  const panelCopy = copy.callbackSummary;
  const metrics = getCheckoutCallbackMetrics(rows);
  const visibleRows = rows.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label={panelCopy.recentCallbacks}
          value={metrics.total}
        />
        <AdminMetricCard
          label={panelCopy.replayedCallbacks}
          value={metrics.replayed}
        />
        <AdminMetricCard
          label={panelCopy.providerPendingCallbacks}
          value={metrics.providerPending}
        />
        <AdminMetricCard
          label={panelCopy.failedCallbacks}
          value={metrics.failed}
        />
      </div>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>{panelCopy.title}</CardTitle>
          <CardDescription>{panelCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{panelCopy.emptyState}</p>
          ) : (
            visibleRows.map((row) => {
              const outcome = getCheckoutCallbackOutcome(row.eventType);
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getOutcomeClasses(
                            outcome
                          )}`}
                        >
                          {getOutcomeLabel(outcome, panelCopy)}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {row.paymentMethodId}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.provider}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getOrderTypeLabel(row, panelCopy)}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="font-medium text-foreground">
                            {panelCopy.checkoutLabel}:{' '}
                          </span>
                          {row.checkoutToken || row.checkoutOrderId || panelCopy.none}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            {panelCopy.targetLabel}:{' '}
                          </span>
                          {getTargetLabel(row, panelCopy)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            {panelCopy.ownerLabel}:{' '}
                          </span>
                          {getOwnerLabel(row, panelCopy)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            {panelCopy.sourceLabel}:{' '}
                          </span>
                          {row.source}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {panelCopy.providerIdsLabel}:{' '}
                        </span>
                        {getProviderIdsLabel(row, panelCopy)}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {copy.table.eventLabel}:{' '}
                        </span>
                        {row.eventType}
                      </div>

                      {row.message ? (
                        <p className="text-sm text-muted-foreground">{row.message}</p>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt, dateLocale)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
