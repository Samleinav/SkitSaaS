'use client';

import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function SectionAdminAppConfigNavItemTemplate({
  className,
  children
}: TemplateProps) {
  const resolvedClassName = className ? `contents ${className}` : 'contents';

  return (
    <div
      className={resolvedClassName}
      data-theme-template="section.admin.app-config-nav.item"
    >
      {children}
    </div>
  );
}
