import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminSuscriptionsUserEditTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Edit User Subscription');
  const description = toStringOrFallback(data?.description, 'Assign or clear user-level subscription template.');
  return (
    <main className={className || 'mx-auto max-w-7xl px-4 py-8'}>
      <section className="rounded-xl border border-border/70 bg-card/80 p-6 text-card-foreground shadow-sm">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-sm opacity-80">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}