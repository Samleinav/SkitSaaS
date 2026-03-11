import type { TemplateProps } from '../template-types';

export default function PageAdminPaymentsTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <div className={className || 'w-full'}>
      {children}
    </div>
  );
}
