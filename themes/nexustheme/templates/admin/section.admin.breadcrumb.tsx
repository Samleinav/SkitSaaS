import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminBreadcrumbTemplate({
  data,
  className
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin');

  return (
    <div
      className={mergeClassNames(
        'mb-1 px-1 text-xs text-muted-foreground',
        className
      )}
      data-breadcrumb-title={title}
      data-nexus-admin-breadcrumb="minimal"
    >
      <span className="text-xs font-medium text-foreground/90">{title}</span>
    </div>
  );
}
