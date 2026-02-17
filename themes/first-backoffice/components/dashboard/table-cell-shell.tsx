'use client';

import type { ReactNode } from 'react';

type TableCellShellData = {
  area?: unknown;
  slot?: unknown;
};

type DashboardTableCellShellProps = {
  templateId: string;
  data?: TableCellShellData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function DashboardTableCellShell({
  templateId,
  data,
  className,
  children
}: DashboardTableCellShellProps) {
  return (
    <span
      className={className}
      data-theme-template={templateId}
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
    >
      {children}
    </span>
  );
}
