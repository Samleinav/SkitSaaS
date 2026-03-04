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
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      </header>
      <section className="@container/admin-home grid gap-6 xl:grid-cols-2 [&>*:first-child]:xl:col-span-2">
        {children}
      </section>
    </main>
  );
}
