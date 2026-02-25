import type { TemplateProps } from '../template-types';
export default function LayoutAdminAppConfigShellTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'space-y-4 rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm'}
    >
      {children}
    </section>
  );
}

