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
      className={mergeClassNames('space-y-4', className)}
      data-nexus-admin-dashboard-slot="overview"
    >
      {title ? (
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {title}
          </p>
          <div className="h-px flex-1 bg-border/60" />
        </div>
      ) : null}
      {children}
    </section>
  );
}
