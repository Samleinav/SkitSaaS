'use client';

import type { TemplateProps } from '../template-types';

export default function SectionAdminTableSubscriptionsCellTemplate({
  className,
  children
}: TemplateProps) {
  return <span className={className}>{children}</span>;
}