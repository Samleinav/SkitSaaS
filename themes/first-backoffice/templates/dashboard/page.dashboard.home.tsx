import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function PageDashboardHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title =
    typeof data?.title === 'string' && data.title.trim().length > 0
      ? data.title
      : 'Dashboard Home';

  return (
    <main
      className={className || 'mx-auto max-w-5xl px-4 py-8'}
      data-theme-template="page.dashboard.home"
    >
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">
          Placeholder template for dashboard route migration.
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}
