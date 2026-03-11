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
              className="rounded-[1.05rem] border border-border/60 bg-background/70 px-3.5 py-2.5"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
                {label}
              </p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={mergeClassNames(
          'space-y-4',
          '[&>div]:space-y-4',
          '[&>div>div:first-child]:grid [&>div>div:first-child]:gap-3 md:[&>div>div:first-child]:grid-cols-2 xl:[&>div>div:first-child]:grid-cols-4',
          '[&_a_[data-slot=card]]:h-auto [&_a_[data-slot=card]]:min-h-0 [&_a_[data-slot=card]]:gap-4 [&_a_[data-slot=card]]:rounded-xl [&_a_[data-slot=card]]:border-border/55 [&_a_[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.3)_100%)] [&_a_[data-slot=card]]:py-4 [&_a_[data-slot=card]]:shadow-[0_14px_36px_-32px_rgba(0,0,0,0.9)] [&_a_[data-slot=card]]:transition-all [&_a_[data-slot=card]]:duration-200 [&_a_[data-slot=card]]:hover:-translate-y-0.5 [&_a_[data-slot=card]]:hover:border-primary/28',
          '[&_a_[data-slot=card-header]]:grid-rows-[auto_auto] [&_a_[data-slot=card-header]]:gap-1.5 [&_a_[data-slot=card-header]]:px-4 [&_a_[data-slot=card-header]]:pb-0 [&_a_[data-slot=card-header]]:pt-4',
          '[&_a_[data-slot=card-header]>div]:space-y-0 [&_a_[data-slot=card-header]>div>span]:hidden',
          '[&_a_[data-slot=card-header]>span]:rounded-md [&_a_[data-slot=card-header]>span]:border-border/60 [&_a_[data-slot=card-header]>span]:px-2 [&_a_[data-slot=card-header]>span]:py-0.5 [&_a_[data-slot=card-header]>span]:text-[10px] [&_a_[data-slot=card-header]>span]:font-medium [&_a_[data-slot=card-header]>span]:tracking-normal [&_a_[data-slot=card-description]]:text-muted-foreground [&_a_[data-slot=card-description]]:text-[13px] [&_a_[data-slot=card-description]]:font-medium',
          '[&_a_[data-slot=card-content]]:space-y-0 [&_a_[data-slot=card-content]]:px-4 [&_a_[data-slot=card-content]]:pt-0 [&_a_[data-slot=card-content]>p:first-child]:text-[2rem] [&_a_[data-slot=card-content]>p:first-child]:font-semibold [&_a_[data-slot=card-content]>p:first-child]:leading-none [&_a_[data-slot=card-content]>div]:hidden',
          '[&_a_[data-slot=card-footer]]:mt-auto [&_a_[data-slot=card-footer]]:flex-col [&_a_[data-slot=card-footer]]:items-start [&_a_[data-slot=card-footer]]:gap-1.5 [&_a_[data-slot=card-footer]]:border-0 [&_a_[data-slot=card-footer]]:px-4 [&_a_[data-slot=card-footer]]:pb-4 [&_a_[data-slot=card-footer]]:pt-0 [&_a_[data-slot=card-footer]]:text-sm',
          '[&_a_[data-slot=card-footer]>div]:flex [&_a_[data-slot=card-footer]>div]:flex-col [&_a_[data-slot=card-footer]>div]:items-start [&_a_[data-slot=card-footer]>div]:gap-1.5 [&_a_[data-slot=card-footer]>div>span]:hidden [&_a_[data-slot=card-footer]>div>div]:space-y-0.5',
          '[&_a_[data-slot=card-footer]_p:first-child]:line-clamp-1 [&_a_[data-slot=card-footer]_p:first-child]:font-medium [&_a_[data-slot=card-footer]_p:first-child]:text-foreground [&_a_[data-slot=card-footer]_p:last-child]:text-[12px] [&_a_[data-slot=card-footer]_p:last-child]:text-muted-foreground',
          '[&>div>[data-slot=card]]:overflow-hidden [&>div>[data-slot=card]]:rounded-xl [&>div>[data-slot=card]]:border-border/55 [&>div>[data-slot=card]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] [&>div>[data-slot=card]]:shadow-[0_18px_42px_-34px_rgba(0,0,0,0.88)]',
          '[&>div>[data-slot=card]_[data-slot=card-header]]:border-border/60',
          className
        )}
      >
        {title ? <p className="sr-only">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}
