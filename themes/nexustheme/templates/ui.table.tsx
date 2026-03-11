'use client';

import type { ReactNode } from 'react';
import { mergeClassNames, useI18n } from '@skitsaas/sdk';

type UiTableArea = 'admin' | 'dashboard';

type UiTableThemeData = {
  area?: UiTableArea | string | null;
  frameClassName?: string | null;
};

type UiTableThemeTemplateProps = {
  data?: UiTableThemeData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function UiTableThemeTemplate({
  data,
  className,
  themeId,
  children
}: UiTableThemeTemplateProps) {
  const normalizedArea: UiTableArea = data?.area === 'dashboard' ? 'dashboard' : 'admin';
  const t = useI18n({ themeId, area: normalizedArea });
  const areaClassName =
    normalizedArea === 'dashboard'
      ? 'ring-1 ring-emerald-400/16'
      : 'ring-1 ring-sky-400/16';
  const surfaceLabel = t(
    normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table'
  );

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        '@container/table overflow-hidden rounded-[1.35rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_100%)] shadow-[0_18px_44px_-34px_rgba(0,0,0,0.78)] transition-shadow',
        areaClassName,
        '[&_[data-slot=table-container]]:overflow-x-auto',
        '[&_[data-slot=table]]:min-w-full [&_[data-slot=table]]:border-separate [&_[data-slot=table]]:border-spacing-0',
        '[&_[data-slot=table-header]_tr]:border-b [&_[data-slot=table-header]_tr]:border-border/60 [&_[data-slot=table-header]_tr]:bg-[linear-gradient(180deg,hsl(var(--muted)/0.42)_0%,hsl(var(--muted)/0.18)_100%)]',
        '[&_[data-slot=table-head]]:h-11 [&_[data-slot=table-head]]:px-4 [&_[data-slot=table-head]]:text-[12px] [&_[data-slot=table-head]]:font-semibold [&_[data-slot=table-head]]:tracking-[-0.01em] [&_[data-slot=table-head]]:text-foreground/88',
        '[&_[data-slot=table-head]_[data-slot=button]]:-ml-1 [&_[data-slot=table-head]_[data-slot=button]]:h-8 [&_[data-slot=table-head]_[data-slot=button]]:rounded-md [&_[data-slot=table-head]_[data-slot=button]]:px-2 [&_[data-slot=table-head]_[data-slot=button]]:text-[12px] [&_[data-slot=table-head]_[data-slot=button]]:font-semibold [&_[data-slot=table-head]_[data-slot=button]]:text-foreground/88 [&_[data-slot=table-head]_[data-slot=button]]:hover:bg-foreground/5',
        '[&_[data-slot=table-body]_[data-slot=table-row]]:border-border/45 [&_[data-slot=table-body]_[data-slot=table-row]]:transition-colors [&_[data-slot=table-body]_[data-slot=table-row]]:hover:bg-muted/18',
        '[&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-3.5 [&_[data-slot=table-cell]]:align-middle',
        '[&_[data-slot=table-cell]_[data-slot=button]]:h-8 [&_[data-slot=table-cell]_[data-slot=button]]:rounded-lg [&_[data-slot=table-cell]_[data-slot=button]]:border-border/60 [&_[data-slot=table-cell]_[data-slot=button]]:bg-background/72 [&_[data-slot=table-cell]_[data-slot=button]]:px-3 [&_[data-slot=table-cell]_[data-slot=button]]:text-[13px] [&_[data-slot=table-cell]_[data-slot=button]]:font-medium [&_[data-slot=table-cell]_[data-slot=button]]:shadow-none [&_[data-slot=table-cell]_[data-slot=button]]:hover:bg-muted/55',
        '[&_[data-slot=table-cell]_.inline-flex.rounded-full]:border-border/55 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:bg-muted/26 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:px-2.5 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:py-1 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:text-[11px] [&_[data-slot=table-cell]_.inline-flex.rounded-full]:leading-none',
        '[&_[data-slot=table-cell]_p:first-child]:tracking-[-0.01em]',
        data?.frameClassName,
        className
      )}
      data-nexus-ui-table={normalizedArea}
    >
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
