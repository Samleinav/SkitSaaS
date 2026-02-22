import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminBreadcrumbTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin');

  return (
    <div
      className={mergeClassNames(
        'rounded-xl border border-border/70 bg-background/70 px-3 py-2 backdrop-blur-sm',
        className
      )}
      data-breadcrumb-title={title}
    >
      {children ?? <span className="text-sm font-medium">{title}</span>}
    </div>
  );
}
