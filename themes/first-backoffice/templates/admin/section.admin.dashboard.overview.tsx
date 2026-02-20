import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardOverviewTemplate({
  className,
  children
}: TemplateProps) {
  return <section className={className}>{children}</section>;
}