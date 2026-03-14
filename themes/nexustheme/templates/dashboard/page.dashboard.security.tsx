import type { TemplateProps } from '../template-types';

export default function PageDashboardSecurityTemplate({
  className,
  children
}: TemplateProps) {
  return <div className={className || 'w-full'}>{children}</div>;
}
