import type { TemplateProps } from '../template-types';
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

