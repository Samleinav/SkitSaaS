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
      ? 'ring-1 ring-emerald-400/20'
      : 'ring-1 ring-sky-400/20';
  const surfaceLabel =
    resolveSurfaceLabel(themeMessages, normalizedArea) ??
    (normalizedArea === 'dashboard' ? 'Dashboard table' : 'Admin table');

  return (
    <div
      aria-label={surfaceLabel}
      className={mergeClassNames(
        'overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm',
        areaClassName,
        data?.frameClassName,
        className
      )}
    >
      {children}
    </div>
  );
}
