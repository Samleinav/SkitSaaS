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
      className={mergeClassNames(
        'overflow-hidden rounded-2xl border border-border/70 bg-card/50 shadow-sm',
        className
      )}
      data-nexus-admin-dashboard-slot="quick-links"
    >
      {title ? (
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {title}
          </p>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}
