import type { ReactNode } from 'react';

type TemplateData = {
  heading?: string;
  layoutStyle?: string;
  mode?: string;
  contentSlot?: ReactNode;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function LayoutDashboardShellTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const content = data?.contentSlot ?? children;

  return (
    <section
      className={className || 'theme-first-backoffice-shell min-h-screen bg-background text-foreground'}
      data-layout-style={data?.layoutStyle?.trim() || undefined}
      data-layout-mode={data?.mode?.trim() || undefined}
      data-layout-heading={data?.heading?.trim() || undefined}
    >
      {content}
    </section>
  );
}

