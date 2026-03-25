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
      ? 'shadow-[inset_0_1px_0_rgba(16,185,129,0.1)]'
      : 'shadow-[inset_0_1px_0_rgba(56,189,248,0.12)]';
  const surfaceLabel = t(
    normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table'
  );

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        '@container/table overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-card-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/92',
        areaClassName,
        '[&_[data-slot=table-container]]:overflow-x-auto',
        '[&_[data-slot=table]]:min-w-full [&_[data-slot=table]]:border-collapse',
        '[&_[data-slot=table-header]]:bg-muted/35',
        '[&_[data-slot=table-header]_tr]:border-b [&_[data-slot=table-header]_tr]:border-border/70',
        '[&_[data-slot=table-head]]:h-12 [&_[data-slot=table-head]]:px-4 [&_[data-slot=table-head]]:text-[11px] [&_[data-slot=table-head]]:font-semibold [&_[data-slot=table-head]]:uppercase [&_[data-slot=table-head]]:tracking-[0.08em] [&_[data-slot=table-head]]:text-muted-foreground',
        '[&_[data-slot=table-head]_[data-slot=button]]:-ml-2 [&_[data-slot=table-head]_[data-slot=button]]:h-8 [&_[data-slot=table-head]_[data-slot=button]]:rounded-md [&_[data-slot=table-head]_[data-slot=button]]:px-2 [&_[data-slot=table-head]_[data-slot=button]]:text-[11px] [&_[data-slot=table-head]_[data-slot=button]]:font-semibold [&_[data-slot=table-head]_[data-slot=button]]:uppercase [&_[data-slot=table-head]_[data-slot=button]]:tracking-[0.08em] [&_[data-slot=table-head]_[data-slot=button]]:text-foreground [&_[data-slot=table-head]_[data-slot=button]]:hover:bg-accent [&_[data-slot=table-head]_[data-slot=button]]:hover:text-accent-foreground',
        '[&_[data-slot=table-body]_[data-slot=table-row]]:border-border/60 [&_[data-slot=table-body]_[data-slot=table-row]]:transition-colors [&_[data-slot=table-body]_[data-slot=table-row]]:hover:bg-muted/35',
        '[&_[data-slot=table-cell]]:px-4 [&_[data-slot=table-cell]]:py-3.5 [&_[data-slot=table-cell]]:align-middle [&_[data-slot=table-cell]]:text-sm',
        '[&_[data-slot=table-cell]_a]:font-medium [&_[data-slot=table-cell]_a]:text-foreground [&_[data-slot=table-cell]_a]:transition-colors [&_[data-slot=table-cell]_a]:hover:text-primary',
        '[&_[data-slot=table-cell]_[data-slot=button]]:h-8 [&_[data-slot=table-cell]_[data-slot=button]]:rounded-md [&_[data-slot=table-cell]_[data-slot=button]]:border-border/70 [&_[data-slot=table-cell]_[data-slot=button]]:bg-background [&_[data-slot=table-cell]_[data-slot=button]]:px-3 [&_[data-slot=table-cell]_[data-slot=button]]:text-[13px] [&_[data-slot=table-cell]_[data-slot=button]]:font-medium [&_[data-slot=table-cell]_[data-slot=button]]:shadow-none [&_[data-slot=table-cell]_[data-slot=button]]:hover:bg-accent [&_[data-slot=table-cell]_[data-slot=button]]:hover:text-accent-foreground',
        '[&_[data-slot=table-cell]_.inline-flex.rounded-full]:border-border/55 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:px-2.5 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:py-1 [&_[data-slot=table-cell]_.inline-flex.rounded-full]:text-[11px] [&_[data-slot=table-cell]_.inline-flex.rounded-full]:font-medium [&_[data-slot=table-cell]_.inline-flex.rounded-full]:leading-none',
        '[&_[data-slot=table-cell]_p:first-child]:font-medium [&_[data-slot=table-cell]_p:first-child]:tracking-[-0.01em] [&_[data-slot=table-cell]_p:first-child]:text-foreground',
        '[&_[data-slot=table-cell]_p:last-child]:text-muted-foreground',
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
