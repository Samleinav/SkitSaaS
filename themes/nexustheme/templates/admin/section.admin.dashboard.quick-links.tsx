import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardQuickLinksTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={mergeClassNames('space-y-4', className)}
      data-nexus-admin-dashboard-slot="quick-links"
    >
      {children}
    </section>
  );
}
