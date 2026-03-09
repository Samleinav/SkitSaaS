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
      ? 'theme-first-backoffice-table-surface-dashboard'
      : 'theme-first-backoffice-table-surface-admin';
  const surfaceLabel = t(
    normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table'
  );

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        'theme-first-backoffice-table-surface overflow-hidden rounded-md border',
        areaClassName,
        data?.frameClassName,
        className
      )}
    >
      {children}
    </div>
  );
}
