import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardOverviewTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);

  return (
    <section
      className={mergeClassNames('space-y-4 xl:col-span-2', className)}
      data-nexus-admin-dashboard-slot="overview"
    >
      {title ? <p className="sr-only">{title}</p> : null}
      {children}
    </section>
  );
}
