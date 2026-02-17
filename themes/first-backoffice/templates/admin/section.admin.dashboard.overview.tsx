import type { ReactNode } from 'react';
import { AdminSectionShell } from '../../components/admin/section-shell';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function SectionAdminDashboardOverviewTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <AdminSectionShell
      templateId="section.admin.dashboard.overview"
      className={className}
    >
      {children}
    </AdminSectionShell>
  );
}
