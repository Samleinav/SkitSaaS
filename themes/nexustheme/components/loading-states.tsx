import { mergeClassNames } from '@skitsaas/sdk';
import { Skeleton } from './ui/skeleton';

type LoadingStateProps = {
  className?: string;
};

/**
 * NexusMetricCardsLoading - Loading state for metric cards grid
 */
export function NexusMetricCardsLoading({ className }: LoadingStateProps) {
  return (
    <div
      className={mergeClassNames('@container/metrics grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}
      data-nexus-loading="metric-cards"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          data-slot="card"
        >
          <Skeleton variant="gradient" className="mb-2 h-4 w-24" />
          <Skeleton variant="gradient" className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * NexusTableLoading - Loading state for data tables
 */
export function NexusTableLoading({ className, rows = 5 }: LoadingStateProps & { rows?: number }) {
  return (
    <div
      className={mergeClassNames('space-y-3', className)}
      data-nexus-loading="table"
    >
      {/* Table header */}
      <div className="flex gap-4 border-b border-border/70 pb-3">
        <Skeleton variant="gradient" className="h-4 w-32" />
        <Skeleton variant="gradient" className="h-4 flex-1" />
        <Skeleton variant="gradient" className="h-4 w-24" />
        <Skeleton variant="gradient" className="h-4 w-20" />
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton variant="gradient" className="h-5 w-32" />
          <Skeleton variant="gradient" className="h-5 flex-1" />
          <Skeleton variant="gradient" className="h-5 w-24" />
          <Skeleton variant="gradient" className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * NexusPageContentLoading - Generic loading state for page content
 */
export function NexusPageContentLoading({ className }: LoadingStateProps) {
  return (
    <div
      className={mergeClassNames('space-y-6', className)}
      data-nexus-loading="page-content"
    >
      {/* Header section */}
      <div className="space-y-2">
        <Skeleton variant="gradient" className="h-6 w-48" />
        <Skeleton variant="gradient" className="h-4 w-96" />
      </div>

      {/* Content blocks */}
      <div className="space-y-4">
        <Skeleton variant="gradient" className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton variant="gradient" className="h-24 rounded-2xl" />
          <Skeleton variant="gradient" className="h-24 rounded-2xl" />
        </div>
        <Skeleton variant="gradient" className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * NexusCardLoading - Loading state for individual card content
 */
export function NexusCardLoading({ className }: LoadingStateProps) {
  return (
    <div
      className={mergeClassNames(
        'overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm',
        className
      )}
      data-nexus-loading="card"
    >
      <div className="space-y-3">
        <Skeleton variant="gradient" className="h-5 w-40" />
        <Skeleton variant="gradient" className="h-4 w-full" />
        <Skeleton variant="gradient" className="h-4 w-3/4" />
        <div className="pt-2">
          <Skeleton variant="gradient" className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * NexusFormLoading - Loading state for forms
 */
export function NexusFormLoading({ className }: LoadingStateProps) {
  return (
    <div
      className={mergeClassNames('space-y-6', className)}
      data-nexus-loading="form"
    >
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="gradient" className="h-4 w-32" />
          <Skeleton variant="gradient" className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Skeleton variant="gradient" className="h-10 w-24 rounded-lg" />
        <Skeleton variant="gradient" className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}
