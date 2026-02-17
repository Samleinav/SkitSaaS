'use client';

import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function SectionAdminAppConfigNavPanelTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className}
      data-theme-template="section.admin.app-config-nav.panel"
    >
      {children}
    </section>
  );
}
