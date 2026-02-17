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
  return (
    <div
      className={className}
      data-theme-template="section.admin.app-config-nav.item"
    >
      {children}
    </div>
  );
}
