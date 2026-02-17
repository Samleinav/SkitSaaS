import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toNumberOrFallback(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toStringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

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
      data-theme-template="section.admin.metrics-grid"
      data-metrics-columns={columns}
      data-metrics-variant={variant}
    >
      {children}
    </section>
  );
}

