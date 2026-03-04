import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';
import { TrendingDown, TrendingUp } from 'lucide-react';

type MetricTrend = {
  direction: 'up' | 'down';
  value: string;
  label?: string;
};

type MetricCardProps = {
  className?: string;
  title: string;
  value: string | number;
  trend?: MetricTrend;
  footer?: {
    primary?: string;
    secondary?: string;
  };
  badge?: ReactNode;
  variant?: 'default' | 'gradient';
};

export function NexusMetricCard({
  className,
  title,
  value,
  trend,
  footer,
  badge,
  variant = 'gradient'
}: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;
  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div
      className={mergeClassNames(
        '@container/card overflow-hidden rounded-xl border border-border/80 shadow-sm transition-colors',
        variant === 'gradient'
          ? 'bg-gradient-to-b from-background/80 to-card dark:from-primary/5 dark:to-card'
          : 'bg-card',
        className
      )}
      data-slot="card"
    >
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground/95">{title}</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground @[250px]/card:text-3xl">
              {value}
            </p>
          </div>
          {(trend || badge) && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/80 bg-background/70 px-2.5 py-1 text-xs font-medium">
              {trend ? (
                <>
                  <TrendIcon className={mergeClassNames('h-3.5 w-3.5', trendColor)} />
                  <span className={trendColor}>{trend.value}</span>
                </>
              ) : (
                badge
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col gap-1 border-t border-border/55 pt-3 text-sm">
            {footer.primary && (
              <div className="flex items-center gap-2 font-medium text-foreground/90">
                <span className="line-clamp-1">{footer.primary}</span>
                {trend && <TrendIcon className={mergeClassNames('h-4 w-4', trendColor)} />}
              </div>
            )}
            {footer.secondary && (
              <div className="text-muted-foreground">{footer.secondary}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type SimpleMetricCardProps = {
  className?: string;
  label: string;
  value: string | number;
  variant?: 'default' | 'gradient';
};

export function NexusSimpleMetricCard({
  className,
  label,
  value,
  variant = 'gradient'
}: SimpleMetricCardProps) {
  return (
    <div
      className={mergeClassNames(
        'overflow-hidden rounded-xl border border-border/80 p-5 shadow-sm',
        variant === 'gradient'
          ? 'bg-gradient-to-b from-background/80 to-card dark:from-primary/5 dark:to-card'
          : 'bg-card',
        className
      )}
      data-slot="card"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground/95">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}
