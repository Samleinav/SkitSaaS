import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminSubscriptionsCreateTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Create Subscription Template');

  return (
    <main className={className || 'mx-auto max-w-7xl px-4 py-8'}>
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}
