import type { TemplateProps } from './template-types';

export default function PageLoginUserTemplate({
  className,
  children
}: TemplateProps) {
  return (
    <section
      className={className || 'min-h-screen bg-background text-foreground'}
    >
      {children}
    </section>
  );
}

