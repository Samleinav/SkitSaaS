import type { ReactNode } from 'react';

export type ThemeTemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

type DashboardPageShellProps = ThemeTemplateProps & {
  templateId: string;
  titleFallback: string;
  descriptionFallback?: string;
};

function toStringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function DashboardPageShell({
  templateId,
  titleFallback,
  descriptionFallback,
  data,
  className,
  children
}: DashboardPageShellProps) {
  const title = toStringOrFallback(data?.title, titleFallback);
  const description = descriptionFallback
    ? toStringOrFallback(data?.description, descriptionFallback)
    : null;

  return (
    <main
      className={className || 'mx-auto max-w-7xl px-4 py-8'}
      data-theme-template={templateId}
    >
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-sm opacity-80">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}
