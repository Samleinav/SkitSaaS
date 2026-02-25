'use client';

import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminAppConfigNavPanelTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={mergeClassNames(
        'space-y-2 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm',
        className
      )}
      data-nexus-app-config-nav-panel="true"
    >
      {children}
    </section>
  );
}

