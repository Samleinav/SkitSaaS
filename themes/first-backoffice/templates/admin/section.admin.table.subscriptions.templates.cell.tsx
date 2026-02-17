'use client';

import type { ReactNode } from 'react';
import { AdminTableCellShell } from '../../components/admin/table-cell-shell';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function SectionAdminTableSubscriptionsTemplatesCellTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <AdminTableCellShell
      templateId="section.admin.table.subscriptions.templates.cell"
      data={data}
      className={className}
    >
      {children}
    </AdminTableCellShell>
  );
}
