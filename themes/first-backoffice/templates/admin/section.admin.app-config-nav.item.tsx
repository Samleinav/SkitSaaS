'use client';

import type { TemplateProps } from '../template-types';
export default function SectionAdminAppConfigNavItemTemplate({
  className,
  children
}: TemplateProps) {
  const resolvedClassName = className ? `contents ${className}` : 'contents';

  return (
    <div
      className={resolvedClassName}
    >
      {children}
    </div>
  );
}

