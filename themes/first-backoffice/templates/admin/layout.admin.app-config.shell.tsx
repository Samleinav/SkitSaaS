import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function LayoutAdminAppConfigShellTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={
        className || 'theme-first-backoffice-shell min-h-full bg-background text-foreground'
      }
      data-theme-template="layout.admin.app-config.shell"
    >
      {children}
    </section>
  );
}

