import { Activity } from 'lucide-react';
import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardRecentActivityTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, null as unknown as string);

  return (
    <section
      className={mergeClassNames(
        'overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm',
        className
      )}
      data-nexus-admin-dashboard-slot="recent-activity"
    >
      {title ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Activity className="h-3 w-3" />
          </span>
          <p className="text-sm font-medium text-foreground/90">{title}</p>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}
