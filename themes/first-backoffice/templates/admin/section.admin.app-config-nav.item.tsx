'use client';

import type { ReactNode } from 'react';

type TemplateProps = {
  className?: string;
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
    >
      {children}
    </div>
  );
}

