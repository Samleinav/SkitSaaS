import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import type { TemplateProps } from '../template-types';

export default function PageAdminHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin Home');
  const description =
    'Executive oversight for platform growth, revenue operations, and system health across the full backoffice.';

  const spotlightItems = [
    {
      label: 'Operations',
      description: 'Orders, payments, and subscriptions in one control surface.',
      icon: Activity
    },
    {
      label: 'Compliance',
      description: 'A sharper overview for auditability, access, and runtime hygiene.',
      icon: ShieldCheck
    },
    {
      label: 'Momentum',
      description: 'A premium dashboard shell that supports denser business content.',
      icon: Sparkles
    }
  ] as const;

  return (
    <main
      className={mergeClassNames('w-full space-y-6', className)}
      data-nexus-admin-home="dashboard-executive"
    >
      <header
        className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(145deg,hsl(var(--background))_0%,hsl(var(--card))_55%,hsl(var(--background))_100%)] px-6 py-7 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.9)] sm:px-8 sm:py-9"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.22),transparent_34%),radial-gradient(circle_at_left_center,hsl(var(--foreground)/0.08),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36rem] bg-[linear-gradient(180deg,transparent_0%,hsl(var(--foreground)/0.03)_100%)] xl:block" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80 backdrop-blur">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              Executive command
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-muted-foreground/80">
                  Admin home
                </p>
                <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {title}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground/75">
                  Surface
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">Enterprise backoffice</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground/75">
                  Focus
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">Growth, operations, and system trust</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {spotlightItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="@container/admin-home [&>div]:grid [&>div]:gap-6 xl:[&>div]:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        {children}
      </section>
    </main>
  );
}
