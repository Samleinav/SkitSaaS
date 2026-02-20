import type { TemplateProps } from '../template-types';

export default function SectionAdminDashboardModuleWidgetTemplate({
  className,
  children
}: TemplateProps) {
  return <section className={className}>{children}</section>;
}