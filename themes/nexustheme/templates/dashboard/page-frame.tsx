import type { ReactNode } from 'react';
import {
  mergeClassNames,
  toStringOrFallback,
  toStringOrNull
} from '@skitsaas/sdk';
import type { TemplateData } from '../template-types';

type DashboardPageFrameProps = {
  data?: TemplateData;
  className?: string;
  eyebrow?: string;
  descriptionFallback?: string | null;
  contentClassName?: string;
  children?: ReactNode;
};

export function DashboardPageFrame({
  data,
  className,
  eyebrow = 'Dashboard',
  descriptionFallback = null,
  contentClassName,
  children
}: DashboardPageFrameProps) {
  const title = toStringOrFallback(data?.title, 'Dashboard');
  const description = toStringOrNull(data?.description) ?? descriptionFallback;

  return (
    <main
      className={mergeClassNames('w-full space-y-5 lg:space-y-6', className)}
      data-nexus-dashboard-page="frame"
    >
      <header className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-[linear-gradient(145deg,hsl(var(--background))_0%,hsl(var(--card))_55%,hsl(var(--background))_100%)] px-6 py-5 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.9)] sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_left_center,hsl(var(--foreground)/0.06),transparent_26%)]" />

        <div className="relative space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary/70">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section
        className={mergeClassNames('space-y-6', contentClassName)}
        data-nexus-dashboard-page-content
      >
        {children}
      </section>
    </main>
  );
}
