'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

type UiTableControlData = {
  area?: 'admin' | 'dashboard' | string | null;
  slot?: string | null;
};

type UiTableControlTemplateProps = {
  data?: UiTableControlData;
  className?: string;
  children?: ReactNode;
};

export default function UiTableControlTemplate({
  data,
  className,
  children
}: UiTableControlTemplateProps) {
  const area = data?.area === 'dashboard' ? 'dashboard' : 'admin';
  const slot =
    typeof data?.slot === 'string' && data.slot.trim().length > 0
      ? data.slot.trim()
      : null;

  if (slot === 'toolbar') {
    return (
      <div
        className={[
          'space-y-4 px-0 py-0',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
        data-theme-area={area}
      >
        {children}
      </div>
    );
  }

  if (slot === 'toolbar.filter') {
    return (
      <div
        className={[
          'relative min-w-0 flex-1 sm:max-w-md [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:border-border/60 [&_[data-slot=input]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.12)_100%)] [&_[data-slot=input]]:pl-10 [&_[data-slot=input]]:pr-3.5 [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:placeholder:text-muted-foreground/80',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        {children}
      </div>
    );
  }

  if (slot === 'toolbar.actions') {
    return (
      <div
        className={[
          'flex flex-wrap items-center gap-2 sm:ml-auto [&_[data-slot=button]]:h-11 [&_[data-slot=button]]:rounded-xl [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.12)_100%)] [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-muted/36',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </div>
    );
  }

  if (slot === 'toolbar.columns-toggle') {
    return (
      <div
        className={[
          '[&_[data-slot=button]]:h-11 [&_[data-slot=button]]:rounded-xl [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.12)_100%)] [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </div>
    );
  }

  if (slot === 'toolbar.columns-toggle.icon') {
    return (
      <span
        className={['ml-1 inline-flex text-muted-foreground', className]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </span>
    );
  }

  if (slot === 'pagination') {
    return (
      <div
        className={[
          'rounded-[1rem] border border-border/55 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.14)_100%)] px-3.5 py-3',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
        data-theme-area={area}
      >
        {children}
      </div>
    );
  }

  if (slot === 'pagination.summary') {
    return (
      <div
        className={[
          'text-xs text-muted-foreground',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </div>
    );
  }

  if (slot === 'pagination.actions') {
    return (
      <div
        className={[
          'ml-auto flex flex-wrap items-center gap-2.5 [&_select]:h-9 [&_select]:rounded-lg [&_select]:border-border/60 [&_select]:bg-background/72 [&_select]:px-3 [&_select]:text-[13px] [&_select]:shadow-none',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </div>
    );
  }

  if (slot === 'pagination.previous' || slot === 'pagination.next') {
    return (
      <div
        className={[
          '[&_[data-slot=button]]:h-9 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-background/72 [&_[data-slot=button]]:px-3.5 [&_[data-slot=button]]:text-[13px] [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-muted/55',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </div>
    );
  }

  const classes = ['contents', className].filter(Boolean).join(' ');

  return (
    <div className={classes} data-theme-slot={slot ?? undefined}>
      {children}
    </div>
  );
}
