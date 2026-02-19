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
  const classes = [
    'contents',
    'theme-first-backoffice-table-control',
    'theme-first-backoffice-table-control-area-' + area,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-theme-slot={slot ?? undefined}>
      {children}
    </div>
  );
}
