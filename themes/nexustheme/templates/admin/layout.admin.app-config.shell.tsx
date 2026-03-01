import type { TemplateProps } from '../template-types';
export default function LayoutAdminAppConfigShellTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'space-y-4'}
    >
      {children}
    </section>
  );
}

