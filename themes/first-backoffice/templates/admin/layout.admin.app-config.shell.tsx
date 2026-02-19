import type { ReactNode } from 'react';

type TemplateProps = {
  className?: string;
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
    >
      {children}
    </section>
  );
}


