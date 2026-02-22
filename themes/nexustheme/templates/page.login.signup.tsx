import type { TemplateProps } from './template-types';

export default function PageLoginSignupTemplate({
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

