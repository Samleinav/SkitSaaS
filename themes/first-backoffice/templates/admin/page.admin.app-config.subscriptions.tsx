import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigSubscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscriptions');
  const description = toStringOrFallback(
    data?.description,
    'Public signup defaults and default-tier subscription behavior.'
  );

  return (
    <main className={className || 'mx-auto max-w-7xl px-4 py-8'}>
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-sm opacity-80">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}
