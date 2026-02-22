'use client';

import type { TemplateProps } from '../template-types';

export default function SectionAdminTableSubscriptionsTemplatesCellTemplate({
  className,
  children
}: TemplateProps) {
  return <span className={className}>{children}</span>;
}