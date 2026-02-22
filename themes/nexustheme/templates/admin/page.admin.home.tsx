import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function PageAdminHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin Home');

  return (
    <main
      className={className || 'w-full px-0 py-0'}
    >
      <section className="rounded-xl border border-border/70 bg-card/80 p-6 text-card-foreground shadow-sm">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">
          Placeholder template for admin dashboard content migration.
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}


