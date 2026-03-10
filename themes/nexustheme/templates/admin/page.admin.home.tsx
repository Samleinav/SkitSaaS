import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin Home');
  const description = 'Executive overview, operational metrics, and system activity.';

  return (
    <main
      className={mergeClassNames('w-full space-y-6', className)}
      data-nexus-admin-home="dashboard-2"
    >
      <header
        className="flex items-end justify-between gap-4 pb-4"
        style={{ borderBottom: '1px solid hsl(var(--border) / 0.7)' }}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block h-5 w-[3px] rounded-full"
              style={{ background: 'hsl(var(--primary))' }}
              aria-hidden="true"
            />
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          </div>
          <p className="pl-[18px] text-sm text-muted-foreground sm:text-base">{description}</p>
        </div>
      </header>
      <section className="@container/admin-home grid gap-6 xl:grid-cols-2 [&>*:first-child]:xl:col-span-2">
        {children}
      </section>
    </main>
  );
}
