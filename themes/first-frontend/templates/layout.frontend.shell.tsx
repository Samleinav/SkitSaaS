import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function LayoutFrontendShellTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'theme-first-frontend-root min-h-screen text-foreground'}
      data-theme-template="layout.frontend.shell"
    >
      {children}
    </section>
  );
}
