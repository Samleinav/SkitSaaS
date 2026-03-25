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
          'space-y-3 px-0 py-0',
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
          'relative min-w-0 flex-1 sm:max-w-md [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:rounded-md [&_[data-slot=input]]:border-border/70 [&_[data-slot=input]]:bg-background [&_[data-slot=input]]:pl-10 [&_[data-slot=input]]:pr-3.5 [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:placeholder:text-muted-foreground/80',
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

  if (slot === 'toolbar.filters') {
    return (
      <div
        className={[
          'flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center',
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

  if (slot === 'toolbar.filter.field') {
    return (
      <div
        className={[
          'min-w-0 flex-1 lg:min-w-[180px] lg:flex-none [&>label]:flex [&>label]:w-full [&>label]:flex-col [&>label]:gap-1.5 [&>label_span]:text-[11px] [&>label_span]:font-medium [&>label_span]:uppercase [&>label_span]:tracking-[0.08em] [&>label_span]:text-muted-foreground [&>label_select]:h-10 [&>label_select]:w-full [&>label_select]:rounded-md [&>label_select]:border-border/70 [&>label_select]:bg-background [&>label_select]:px-3 [&>label_select]:text-sm [&>label_select]:shadow-none [&>label_input]:h-10 [&>label_input]:w-full [&>label_input]:rounded-md [&>label_input]:border-border/70 [&>label_input]:bg-background [&>label_input]:px-3 [&>label_input]:text-sm [&>label_input]:shadow-none',
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
          'flex flex-wrap items-center gap-2 sm:ml-auto [&_[data-slot=button]]:h-10 [&_[data-slot=button]]:rounded-md [&_[data-slot=button]]:border-border/70 [&_[data-slot=button]]:bg-background [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-accent [&_[data-slot=button]]:hover:text-accent-foreground',
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
          '[&_[data-slot=button]]:h-10 [&_[data-slot=button]]:rounded-md [&_[data-slot=button]]:border-border/70 [&_[data-slot=button]]:bg-background [&_[data-slot=button]]:px-4 [&_[data-slot=button]]:text-sm [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none',
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

  if (slot === 'toolbar.columns-toggle.menu-content') {
    return (
      <div
        className={[
          '[&_[data-slot=dropdown-menu-content]]:min-w-[180px] [&_[data-slot=dropdown-menu-content]]:rounded-lg [&_[data-slot=dropdown-menu-content]]:border-border/70 [&_[data-slot=dropdown-menu-content]]:bg-popover [&_[data-slot=dropdown-menu-content]]:shadow-md',
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

  if (slot === 'toolbar.columns-toggle.menu-item-label') {
    return (
      <span
        className={['text-sm text-popover-foreground', className]
          .filter(Boolean)
          .join(' ')}
        data-theme-slot={slot}
      >
        {children}
      </span>
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
          'rounded-xl border border-border/70 bg-card/75 px-4 py-3',
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
          'ml-auto flex flex-wrap items-center gap-2.5 [&_select]:h-9 [&_select]:rounded-md [&_select]:border-border/70 [&_select]:bg-background [&_select]:px-3 [&_select]:text-[13px] [&_select]:shadow-none',
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
          '[&_[data-slot=button]]:h-9 [&_[data-slot=button]]:rounded-md [&_[data-slot=button]]:border-border/70 [&_[data-slot=button]]:bg-background [&_[data-slot=button]]:px-3.5 [&_[data-slot=button]]:text-[13px] [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-accent [&_[data-slot=button]]:hover:text-accent-foreground',
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

  if (slot === 'body.empty') {
    return (
      <div
        className={[
          'flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground',
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
