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
        'rounded-xl border border-border/70 bg-card/80 px-4 py-2.5 shadow-sm',
        className
      )}
      data-breadcrumb-title={title}
    >
      {children ?? (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Admin
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}
    </div>
  );
}
