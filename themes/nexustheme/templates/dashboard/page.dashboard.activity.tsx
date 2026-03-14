import type { TemplateProps } from '../template-types';

export default function PageDashboardActivityTemplate({
  className,
  children
}: TemplateProps) {
  return <div className={className || 'w-full'}>{children}</div>;
}
