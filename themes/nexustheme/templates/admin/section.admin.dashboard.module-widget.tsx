import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardModuleWidgetTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={mergeClassNames('min-w-0', className)}
      data-nexus-admin-dashboard-slot="module-widget"
    >
      {children}
    </section>
  );
}
