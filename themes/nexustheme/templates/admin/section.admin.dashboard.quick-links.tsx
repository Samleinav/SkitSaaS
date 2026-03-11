import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardQuickLinksTemplate({
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
      data-nexus-admin-dashboard-slot="quick-links"
    >
      <div className="border-b border-border/60 px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
          Quick access
        </p>
        <div className="mt-2 space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Operational workspaces
          </h3>
          <p className="text-sm leading-7 text-muted-foreground">
            Open the sections that usually require review or intervention.
          </p>
        </div>
      </div>

      <div
        className={mergeClassNames(
          '[&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:shadow-none',
          '[&_[data-slot=card-content]]:grid [&_[data-slot=card-content]]:gap-4 [&_[data-slot=card-content]]:px-6 [&_[data-slot=card-content]]:pb-6 [&_[data-slot=card-content]]:pt-6 xl:[&_[data-slot=card-content]]:grid-cols-2',
          '[&_a]:rounded-[1.35rem] [&_a]:border [&_a]:border-border/60 [&_a]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.55)_100%)] [&_a]:p-5 [&_a]:shadow-[0_18px_50px_-38px_rgba(0,0,0,0.75)] [&_a]:transition-all [&_a]:duration-200 [&_a]:hover:-translate-y-0.5 [&_a]:hover:border-primary/35 [&_a]:hover:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--accent)/0.3)_100%)]',
          '[&_a_span]:rounded-2xl [&_a_span]:border-border/60 [&_a_span]:bg-background/80',
          className
        )}
      >
        {title ? <p className="sr-only">{title}</p> : null}
        {children}
      </div>
    </section>
  );
}
