'use client';

import type { ReactNode } from 'react';
import { useThemeMessages } from '@skitsaas/sdk';

type UiTableThemeData = {
  area?: string | null;
  templateId?: string | null;
  templateSource?: string | null;
  frameClassName?: string | null;
};

type UiTableThemeTemplateProps = {
  data?: UiTableThemeData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function mergeClassNames(
  ...values: Array<string | null | undefined | false>
) {
  return values.filter(Boolean).join(' ');
}

function resolveSurfaceLabel(
  messages: Record<string, unknown>,
  area: 'admin' | 'dashboard'
) {
  const areaTree = messages[area];
  if (!areaTree || typeof areaTree !== 'object') {
    return null;
  }

  const tableTree = (areaTree as Record<string, unknown>).table;
  if (!tableTree || typeof tableTree !== 'object') {
    return null;
  }

  const label = (tableTree as Record<string, unknown>).surfaceLabel;
  if (typeof label !== 'string' || label.trim().length === 0) {
    return null;
  }

  return label.trim();
}

export default function UiTableThemeTemplate({
  data,
  className,
  themeId,
  children
}: UiTableThemeTemplateProps) {
  const normalizedArea = data?.area === 'dashboard' ? 'dashboard' : 'admin';
  const themeMessages = useThemeMessages(themeId) as Record<string, unknown>;
  const areaClassName =
    normalizedArea === 'dashboard'
      ? 'theme-first-backoffice-table-surface-dashboard'
      : 'theme-first-backoffice-table-surface-admin';
  const surfaceLabel =
    resolveSurfaceLabel(themeMessages, normalizedArea) ??
    (normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table');

  return (
    <div
      data-theme-template="ui.table"
      data-theme-table-area={normalizedArea}
      data-template-id={data?.templateId ?? undefined}
      data-template-source={data?.templateSource ?? 'theme_code'}
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
