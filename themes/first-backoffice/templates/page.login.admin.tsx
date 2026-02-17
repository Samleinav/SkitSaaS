import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function PageLoginAdminTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'theme-first-backoffice-shell min-h-screen'}
      data-theme-template="page.login.admin"
    >
      {children}
    </section>
  );
}
