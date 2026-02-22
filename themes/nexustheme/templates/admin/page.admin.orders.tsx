import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminOrdersTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Orders');
  const description = toStringOrFallback(data?.description, 'Operational payment orders and statuses.');

  return (
    <main
      className={className || 'w-full px-0 py-0'}
    >
      <section className="rounded-xl border border-border/70 bg-card/80 p-6 text-card-foreground shadow-sm">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">{description}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}


