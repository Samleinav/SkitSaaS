import type { ReactNode } from 'react';

type TemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function SectionAdminDashboardRecentActivityTemplate({
  className,
  children
}: TemplateProps) {
  return <section className={className}>{children}</section>;
}