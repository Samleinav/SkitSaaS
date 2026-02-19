'use client';

import type { ReactNode } from 'react';
import { ThemeTemplate } from '@/components/ui/theme-template';

type DashboardTableSlotTemplateProps = {
  templateId: string;
  slot: string;
  className?: string;
  data?: Record<string, unknown>;
  children?: ReactNode;
};

export function DashboardTableSlotTemplate({
  templateId,
  slot,
  className,
  data,
  children
}: DashboardTableSlotTemplateProps) {
  const fallback = <>{children ?? null}</>;

  return (
    <ThemeTemplate
      id={templateId}
      data={{
        area: 'dashboard',
        slot,
        ...(data ?? {})
      }}
      className={className}
      fallback={fallback}
    >
      {children}
    </ThemeTemplate>
  );
}
