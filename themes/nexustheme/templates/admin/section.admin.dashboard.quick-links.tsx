import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardQuickLinksTemplate({
  className,
  children
}: TemplateProps) {
  return <section className={className}>{children}</section>;
}