'use client';

import type { ReactNode } from 'react';

type TemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function SectionAdminTableSubscriptionsTemplatesCellTemplate({
  className,
  children
}: TemplateProps) {
  return <span className={className}>{children}</span>;
}