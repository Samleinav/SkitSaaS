import { mergeClassNames, toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminMetricsGridTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const columns = toNumberOrFallback(data?.columns, 4);
  const variant = toStringOrFallback(data?.variant, 'default');
  const columnClassName =
    columns >= 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : columns === 3
        ? 'sm:grid-cols-2 xl:grid-cols-3'
        : columns === 2
          ? 'sm:grid-cols-2'
          : 'sm:grid-cols-1';

  return (
    <section
      className={mergeClassNames(
        '@container/metrics',
        variant === 'users' ? '2xl:max-w-5xl' : null,
        // Apply gradient styling to any descendant card (works even when cards
        // are wrapped in the page's own grid div passed as children)
        '[&_[data-slot=card]]:from-primary/5 [&_[data-slot=card]]:to-card',
        'dark:[&_[data-slot=card]]:bg-card [&_[data-slot=card]]:bg-gradient-to-t',
        '[&_[data-slot=card]]:shadow-sm',
        className
      )}
      data-metrics-columns={columns}
      data-metrics-variant={variant}
      data-nexus-metrics-grid="modern"
    >
      {children}
    </section>
  );
}