import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigGeneralTemplate({
  className,
  children
}: TemplateProps) {
  return <div className={className || 'w-full'}>{children}</div>;
}
