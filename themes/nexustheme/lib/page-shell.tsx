import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

type NexusPageShellProps = {
  className?: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  actions?: ReactNode;
  variant?: 'default' | 'compact' | 'spacious';
  children?: ReactNode;
};

export function NexusPageShell({
  className,
  title,
  description,
  badge,
  actions,
  variant = 'default',
  children
}: NexusPageShellProps) {
  const headerPadding =
    variant === 'compact'
      ? 'px-4 py-3 sm:px-5'
      : variant === 'spacious'
        ? 'px-6 py-5 sm:px-7'
        : 'px-5 py-4 sm:px-6';

  const contentPadding =
    variant === 'compact'
      ? 'px-4 py-4 sm:px-5'
      : variant === 'spacious'
        ? 'px-6 py-6 sm:px-7'
        : 'px-5 py-5 sm:px-6';

  return (
    <main className={mergeClassNames('w-full px-0 py-0', className)} data-nexus-page-shell={variant}>
      <section
        className="overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm"
        style={{ borderTop: '2px solid hsl(var(--primary) / 0.55)' }}
      >
        <header
          className={mergeClassNames(
            'flex flex-wrap items-start justify-between gap-3 border-b border-border/70',
            headerPadding
          )}
          style={{ background: 'linear-gradient(to bottom, hsl(var(--primary) / 0.06) 0%, transparent 100%)' }}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground/90">{description}</p>
            ) : null}
          </div>
          {(badge || actions) && (
            <div className="flex shrink-0 items-center gap-2">
              {badge ? (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase"
                  style={{
                    border: '1px solid hsl(var(--primary) / 0.28)',
                    background: 'hsl(var(--primary) / 0.09)',
                    color: 'hsl(var(--primary) / 0.9)'
                  }}
                >
                  {badge}
                </span>
              ) : null}
              {actions}
            </div>
          )}
        </header>
        <div className={contentPadding}>{children}</div>
      </section>
    </main>
  );
}
