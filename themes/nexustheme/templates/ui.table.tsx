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
      ? 'ring-1 ring-emerald-400/20'
      : 'ring-1 ring-sky-400/20';
  const surfaceLabel = t(
    normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table'
  );

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        '@container/table overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md',
        areaClassName,
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
