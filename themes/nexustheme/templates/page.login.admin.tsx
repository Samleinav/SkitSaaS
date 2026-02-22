import type { TemplateProps } from './template-types';

export default function PageLoginAdminTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'theme-nexus-shell min-h-screen'}
    >
      {children}
    </section>
  );
}

