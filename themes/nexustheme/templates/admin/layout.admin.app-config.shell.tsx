import type { TemplateProps } from '../template-types';
export default function LayoutAdminAppConfigShellTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={
        className || 'theme-nexus-shell min-h-full bg-background text-foreground'
      }
    >
      {children}
    </section>
  );
}

