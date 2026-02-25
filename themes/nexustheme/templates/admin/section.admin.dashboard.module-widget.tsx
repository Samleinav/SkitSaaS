import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardModuleWidgetTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={mergeClassNames(
        'overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5',
        className
      )}
      data-nexus-admin-dashboard-slot="module-widget"
    >
      {children}
    </section>
  );
}
