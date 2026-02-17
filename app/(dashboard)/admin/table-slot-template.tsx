'use client';

import type { ReactNode } from 'react';
import { ThemeTemplate } from '@/components/ui/theme-template';

type AdminTableSlotTemplateProps = {
  templateId: string;
  themeId?: string | null;
  slot: string;
  className?: string;
  data?: Record<string, unknown>;
  children?: ReactNode;
};

export function AdminTableSlotTemplate({
  templateId,
  themeId = null,
  slot,
  className,
  data,
  children
}: AdminTableSlotTemplateProps) {
  const fallback = <>{children ?? null}</>;

  return (
    <ThemeTemplate
      id={templateId}
      themeId={themeId}
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
