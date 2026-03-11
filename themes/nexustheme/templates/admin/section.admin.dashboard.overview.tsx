import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardOverviewTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);
  const focusAreas = [
    ['Users', 'Accounts, roles, and admin coverage'],
    ['Teams', 'Organization footprint and ownership'],
    ['Subscriptions', 'Active, unpaid, and canceled plans'],
    ['Orders', 'Pending and failed checkout flow']
  ] as const;

  return (
    <section
      className={mergeClassNames('space-y-4 xl:col-span-2', className)}
      data-nexus-admin-dashboard-slot="overview"
    >
      <div className="flex flex-col gap-4 rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] px-5 py-4 shadow-[0_24px_64px_-48px_rgba(0,0,0,0.95)] lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
            Performance snapshot
          </p>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Core admin signals
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Review the areas that usually need action first: accounts, organization scope, subscription health, and order issues.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {focusAreas.map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1.2rem] border border-border/60 bg-background/70 px-4 py-3"
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
          'space-y-4',
          '[&>div]:space-y-4',
          '[&>div>div:first-child]:grid [&>div>div:first-child]:gap-4 md:[&>div>div:first-child]:grid-cols-2 2xl:[&>div>div:first-child]:grid-cols-3',
          '[&_a_[data-slot=card]]:min-h-[13rem] [&_a_[data-slot=card]]:rounded-[1.6rem] [&_a_[data-slot=card]]:border-border/60 [&_a_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--muted)/0.72)_0%,hsl(var(--card))_100%)] [&_a_[data-slot=card]]:shadow-[0_18px_52px_-42px_rgba(0,0,0,0.95)] [&_a_[data-slot=card]]:transition-all [&_a_[data-slot=card]]:duration-200 [&_a_[data-slot=card]]:hover:-translate-y-0.5 [&_a_[data-slot=card]]:hover:border-primary/35',
          '[&_a_[data-slot=card-header]]:px-5 [&_a_[data-slot=card-header]]:pb-0 [&_a_[data-slot=card-header]]:pt-5 [&_a_[data-slot=card-description]]:text-sm [&_a_[data-slot=card-description]]:text-foreground/80',
          '[&_a_[data-slot=card-content]]:space-y-3 [&_a_[data-slot=card-content]]:px-5 [&_a_[data-slot=card-content]]:pt-3 [&_a_[data-slot=card-content]>p:first-child]:text-[2rem]',
          '[&_a_[data-slot=card-footer]]:mt-auto [&_a_[data-slot=card-footer]]:px-5 [&_a_[data-slot=card-footer]]:py-4 [&_a_[data-slot=card-footer]_p:last-child]:text-[11px]',
          '[&>div>[data-slot=card]]:overflow-hidden [&>div>[data-slot=card]]:rounded-[1.75rem] [&>div>[data-slot=card]]:border-border/60 [&>div>[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] [&>div>[data-slot=card]]:shadow-[0_24px_64px_-50px_rgba(0,0,0,0.95)]',
          '[&>div>[data-slot=card]_[data-slot=card-header]]:border-border/60 [&>div>[data-slot=card]_[data-slot=card-header]]:px-5 [&>div>[data-slot=card]_[data-slot=card-header]]:pt-5',
          className
        )}
      >
        {title ? <p className="sr-only">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}
