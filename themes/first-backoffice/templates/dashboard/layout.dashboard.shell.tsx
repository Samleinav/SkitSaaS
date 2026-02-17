import type { ReactNode } from 'react';

type LayoutDashboardShellData = {
  heading?: unknown;
  layoutStyle?: unknown;
  mode?: unknown;
  contentSlot?: ReactNode;
};

type TemplateProps = {
  data?: LayoutDashboardShellData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function LayoutDashboardShellTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const content = data?.contentSlot ?? children;

  return (
    <section
      className={className || 'theme-first-backoffice-shell min-h-screen bg-background text-foreground'}
      data-theme-template="layout.dashboard.shell"
      data-layout-style={toStringOrNull(data?.layoutStyle) ?? undefined}
      data-layout-mode={toStringOrNull(data?.mode) ?? undefined}
      data-layout-heading={toStringOrNull(data?.heading) ?? undefined}
    >
      {content}
    </section>
  );
}
