import { toNumberOrFallback, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminMetricsGridTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const columns = toNumberOrFallback(data?.columns, 4);
  const variant = toStringOrFallback(data?.variant, 'default');

  return (
    <section
      className={className}
      data-metrics-columns={columns}
      data-metrics-variant={variant}
    >
      {children}
    </section>
  );
}

