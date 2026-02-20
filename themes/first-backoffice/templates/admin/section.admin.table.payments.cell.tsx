'use client';

import type { TemplateProps } from '../template-types';

export default function SectionAdminTablePaymentsCellTemplate({
  className,
  children
}: TemplateProps) {
  return <span className={className}>{children}</span>;
}