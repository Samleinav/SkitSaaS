import type { TemplateProps } from '../template-types';

export default function PageAdminAppConfigHomeTemplate({
  className,
  children
}: TemplateProps) {
  return <div className={className || 'w-full'}>{children}</div>;
}
