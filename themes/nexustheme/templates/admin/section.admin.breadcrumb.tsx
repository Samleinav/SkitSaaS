import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminBreadcrumbTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin');

  return (
    <div
      className={className}
      data-breadcrumb-title={title}
    >
      {children}
    </div>
  );
}

