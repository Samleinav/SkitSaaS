'use client';

import type { TemplateProps } from '../template-types';
export default function SectionAdminAppConfigNavPanelTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className}
    >
      {children}
    </section>
  );
}

