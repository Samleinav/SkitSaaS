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

export default function SectionAdminAppConfigNavTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const section = toStringOrFallback(data?.section, 'app-config');

  return (
    <div
      className={className}
      data-theme-template="section.admin.app-config-nav"
      data-admin-section={section}
    >
      {children}
    </div>
  );
}

