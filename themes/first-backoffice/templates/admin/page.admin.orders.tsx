import type { TemplateProps } from '../template-types';

export default function PageAdminOrdersTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <main className={className || 'w-full'}>
      {children}
    </main>
  );
}
