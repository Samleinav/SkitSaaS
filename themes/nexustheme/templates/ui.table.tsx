'use client';

import type { ReactNode } from 'react';
import { mergeClassNames, useThemeMessages } from '@skitsaas/sdk';

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

type UiTableThemeMessages = Partial<
  Record<
    UiTableArea,
    {
      table?: {
        surfaceLabel?: string | null;
      };
    }
  >
>;

function resolveSurfaceLabel(
  messages: UiTableThemeMessages,
  area: UiTableArea
) {
  const label = messages[area]?.table?.surfaceLabel;
  if (typeof label !== 'string') {
    return null;
  }

  const normalizedLabel = label.trim();
  return normalizedLabel.length > 0 ? normalizedLabel : null;
}

export default function UiTableThemeTemplate({
  data,
  className,
  themeId,
  children
}: UiTableThemeTemplateProps) {
  const normalizedArea: UiTableArea = data?.area === 'dashboard' ? 'dashboard' : 'admin';
  const themeMessages = useThemeMessages(themeId) as UiTableThemeMessages;
  const areaClassName =
    normalizedArea === 'dashboard'
      ? 'theme-nexus-table-surface-dashboard'
      : 'theme-nexus-table-surface-admin';
  const surfaceLabel =
    resolveSurfaceLabel(themeMessages, normalizedArea) ??
    (normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table');

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        'theme-nexus-table-surface overflow-hidden rounded-md border',
        areaClassName,
        data?.frameClassName,
        className
      )}
    >
      {children}
    </div>
  );
}
