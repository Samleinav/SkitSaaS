'use client';

import type { ReactNode } from 'react';

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
          'rounded-[1.1rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--muted)/0.28)_0%,hsl(var(--background))_100%)] px-3.5 py-3 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.7)]',
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
          'min-w-0 flex-1 sm:max-w-md [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:rounded-lg [&_[data-slot=input]]:border-border/60 [&_[data-slot=input]]:bg-background/70 [&_[data-slot=input]]:px-3.5 [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:shadow-none',
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

  if (slot === 'toolbar.actions') {
    return (
      <div
        className={[
          'flex items-center gap-2 sm:ml-auto sm:pl-3 sm:border-l sm:border-border/50 [&_[data-slot=button]]:h-10 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:px-3.5 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none',
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

  if (slot === 'pagination') {
    return (
      <div
        className={[
          'rounded-[1rem] border border-border/55 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] px-3.5 py-2.5',
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
          'ml-auto flex items-center gap-2',
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
          '[&_[data-slot=button]]:h-8 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-background/72 [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:text-[13px] [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-muted/55',
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
