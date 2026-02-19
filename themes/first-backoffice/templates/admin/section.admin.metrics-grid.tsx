import type { ReactNode } from 'react';

type TemplateData = {
  columns?: number;
  variant?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function SectionAdminMetricsGridTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const columns = data?.columns ?? 4;
  const variant = data?.variant?.trim() || 'default';

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


