import type { TemplateProps } from './template-types';

export default function PageLoginAdminTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'theme-first-backoffice-shell min-h-screen'}
    >
      {children}
    </section>
  );
}

