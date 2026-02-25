'use client';

import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminAppConfigNavItemTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <div
      className={mergeClassNames(
        'contents',
        className
      )}
      data-nexus-app-config-nav-item="true"
    >
      {children}
    </div>
  );
}

