import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin Home');
  const description =
    'Overview of users, organizations, subscriptions, orders, payments, and recent system activity.';

  return (
    <main
      className={mergeClassNames('w-full space-y-6', className)}
      data-nexus-admin-home="dashboard-executive"
    >
      <header
        className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(145deg,hsl(var(--background))_0%,hsl(var(--card))_55%,hsl(var(--background))_100%)] px-6 py-5 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.9)] sm:px-7 sm:py-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_left_center,hsl(var(--foreground)/0.06),transparent_26%)]" />

        <div className="relative space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
            Admin
          </p>
          <div className="space-y-2">
            <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </header>

      <section className="@container/admin-home rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--muted)/0.4)_0%,hsl(var(--background))_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4 xl:p-5 [&>div]:grid [&>div]:gap-6 xl:[&>div]:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        {children}
      </section>
    </main>
  );
}
