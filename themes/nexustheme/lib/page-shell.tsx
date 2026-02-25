import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

type NexusPageShellProps = {
  className?: string;
  title: string;
  description?: string | null;
  badge?: string | null;
  children?: ReactNode;
};

export function NexusPageShell({
  className,
  title,
  description,
  badge,
  children
}: NexusPageShellProps) {
  return (
    <main className={mergeClassNames('w-full px-0 py-0', className)}>
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {badge}
            </span>
          ) : null}
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </section>
    </main>
  );
}
