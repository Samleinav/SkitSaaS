import { toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from './template-types';

export default function SystemNotFoundTemplate({
  data,
  className
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Not Found');
  const message = toStringOrFallback(data?.message, 'This backoffice route is not available.');

  return (
    <main
      className={className || 'mx-auto max-w-3xl px-4 py-20'}
    >
      <section className="rounded-xl border border-border/70 bg-card/80 p-8 text-center text-card-foreground shadow-sm">
        <p className="text-xs tracking-[0.2em] uppercase opacity-70">404</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm opacity-80">{message}</p>
      </section>
    </main>
  );
}

