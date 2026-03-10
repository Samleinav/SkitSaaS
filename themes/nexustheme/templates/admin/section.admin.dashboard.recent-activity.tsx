import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardRecentActivityTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);

  return (
    <section
      className={mergeClassNames(
        'min-w-0 overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] shadow-[0_24px_70px_-54px_rgba(0,0,0,0.95)]',
        className
      )}
      data-nexus-admin-dashboard-slot="recent-activity"
    >
      <div className="border-b border-border/60 px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
          Monitoring
        </p>
        <div className="mt-2 space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Recent system activity and operational events
          </h3>
          <p className="text-sm leading-7 text-muted-foreground">
            Track the latest signals without leaving the dashboard.
          </p>
        </div>
      </div>

      <div
        className={mergeClassNames(
          '[&_[data-slot=card]]:max-w-none [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:shadow-none',
          '[&_[data-slot=card-header]]:px-6 [&_[data-slot=card-header]]:pt-6',
          '[&_[data-slot=card-content]]:px-6 [&_[data-slot=card-content]]:pb-6',
          '[&_ul]:space-y-3 [&_li]:rounded-[1.25rem] [&_li]:border [&_li]:border-border/60 [&_li]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.45)_100%)] [&_li]:px-4 [&_li]:py-3 [&_li]:shadow-[0_16px_44px_-34px_rgba(0,0,0,0.78)]',
          className
        )}
      >
        {title ? <p className="sr-only">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}
