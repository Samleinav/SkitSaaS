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

export default function SectionAdminNavTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const variant = toStringOrFallback(data?.variant, 'basic');
  const mode = toStringOrFallback(data?.mode, 'compact');

  return (
    <div
      className={className}
      data-theme-template="section.admin.nav"
      data-nav-variant={variant}
      data-nav-mode={mode}
    >
      {children}
    </div>
  );
}

