import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardRecentActivityTemplate({
  className,
  children
}: TemplateProps) {
  return <section className={className}>{children}</section>;
}