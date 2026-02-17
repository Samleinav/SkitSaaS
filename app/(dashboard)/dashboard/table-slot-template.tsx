'use client';

import type { ReactNode } from 'react';
import { ThemeTemplate } from '@/components/ui/theme-template';

type DashboardTableSlotTemplateProps = {
  templateId: string;
  themeId?: string | null;
  slot: string;
  className?: string;
  data?: Record<string, unknown>;
  children?: ReactNode;
};

export function DashboardTableSlotTemplate({
  templateId,
  themeId = null,
  slot,
  className,
  data,
  children
}: DashboardTableSlotTemplateProps) {
  const fallback = <>{children ?? null}</>;

  return (
    <ThemeTemplate
      id={templateId}
      themeId={themeId}
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
