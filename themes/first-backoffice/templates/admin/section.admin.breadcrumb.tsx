import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export default function SectionAdminBreadcrumbTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Admin');

  return (
    <div
      className={className}
      data-theme-template="section.admin.breadcrumb"
      data-breadcrumb-title={title}
    >
      {children}
    </div>
  );
}

