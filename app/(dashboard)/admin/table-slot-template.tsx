'use client';

import type { ReactNode } from 'react';
import { ThemeTemplate } from '@/components/ui/theme-template';

type AdminTableSlotTemplateProps = {
  templateId: string;
  slot: string;
  className?: string;
  data?: Record<string, unknown>;
  children?: ReactNode;
};

export function AdminTableSlotTemplate({
  templateId,
  slot,
  className,
  data,
  children
}: AdminTableSlotTemplateProps) {
  const fallback = <>{children ?? null}</>;

  return (
    <ThemeTemplate
      id={templateId}
      data={{
        area: 'admin',
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
