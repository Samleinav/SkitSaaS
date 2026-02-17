'use client';

import type { ReactNode } from 'react';
import { DashboardTableCellShell } from '../../components/dashboard/table-cell-shell';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function SectionDashboardTableSubscriptionsPaymentsCellTemplate({
  data,
  className,
  children
}: TemplateProps) {
  return (
    <DashboardTableCellShell
      templateId="section.dashboard.table.subscriptions.payments.cell"
      data={data}
      className={className}
    >
      {children}
    </DashboardTableCellShell>
  );
}
