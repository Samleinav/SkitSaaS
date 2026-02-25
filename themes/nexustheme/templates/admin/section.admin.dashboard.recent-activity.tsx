import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardRecentActivityTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={mergeClassNames('space-y-4', className)}
      data-nexus-admin-dashboard-slot="recent-activity"
    >
      {children}
    </section>
  );
}
