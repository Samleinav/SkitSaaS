import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardOverviewTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);

  return (
    <section
      className={mergeClassNames('space-y-5 xl:col-span-2', className)}
      data-nexus-admin-dashboard-slot="overview"
    >
      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] px-6 py-5 shadow-[0_28px_80px_-52px_rgba(0,0,0,0.95)] lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
            Performance snapshot
          </p>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Executive metrics and operational momentum
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Review the signals that matter first: users, teams, subscription health, and order flow.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Audience', 'Users and organizations'],
            ['Revenue', 'Subscriptions and orders'],
            ['System', 'Recent activity and status']
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={mergeClassNames(
          'space-y-5',
          '[&>div]:space-y-5',
          '[&>div>div:first-child]:grid [&>div>div:first-child]:gap-5 md:[&>div>div:first-child]:grid-cols-2 2xl:[&>div>div:first-child]:grid-cols-3',
          '[&_a_[data-slot=card]]:rounded-[1.8rem] [&_a_[data-slot=card]]:border-border/60 [&_a_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] [&_a_[data-slot=card]]:shadow-[0_22px_60px_-44px_rgba(0,0,0,0.95)] [&_a_[data-slot=card]]:transition-all [&_a_[data-slot=card]]:duration-200 [&_a_[data-slot=card]]:hover:-translate-y-0.5 [&_a_[data-slot=card]]:hover:border-primary/35',
          '[&_a_[data-slot=card-header]]:pb-0 [&_a_[data-slot=card-description]]:text-xs [&_a_[data-slot=card-description]]:uppercase [&_a_[data-slot=card-description]]:tracking-[0.22em] [&_a_[data-slot=card-description]]:text-muted-foreground/70 [&_a_[data-slot=card-content]]:pt-5',
          '[&>div>[data-slot=card]]:overflow-hidden [&>div>[data-slot=card]]:rounded-[2rem] [&>div>[data-slot=card]]:border-border/60 [&>div>[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] [&>div>[data-slot=card]]:shadow-[0_28px_70px_-54px_rgba(0,0,0,0.95)]',
          '[&>div>[data-slot=card]_[data-slot=card-header]]:border-border/60 [&>div>[data-slot=card]_[data-slot=card-header]]:px-6 [&>div>[data-slot=card]_[data-slot=card-header]]:pt-6',
          className
        )}
      >
        {title ? <p className="sr-only">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}
