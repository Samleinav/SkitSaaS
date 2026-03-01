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
        'space-y-2',
        className
      )}
      data-nexus-app-config-nav-panel="true"
    >
      {children}
    </section>
  );
}

