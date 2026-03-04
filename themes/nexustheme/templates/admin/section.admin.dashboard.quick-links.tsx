import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardQuickLinksTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);

  return (
    <section
      className={mergeClassNames('min-w-0', className)}
      data-nexus-admin-dashboard-slot="quick-links"
    >
      {title ? <p className="sr-only">{title}</p> : null}
      {children}
    </section>
  );
}
