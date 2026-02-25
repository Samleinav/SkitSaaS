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
        'grid gap-4',
        columnClassName,
        variant === 'users' ? '2xl:max-w-5xl' : null,
        className
      )}
      data-metrics-columns={columns}
      data-metrics-variant={variant}
    >
      {children}
    </section>
  );
}