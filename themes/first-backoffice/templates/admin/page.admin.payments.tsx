import type { TemplateProps } from '../template-types';

export default function PageAdminPaymentsTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <main className={className || 'w-full'}>
      {children}
    </main>
  );
}
