import type { ReactNode } from 'react';

type TemplateData = {
  title?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function PageAdminHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = data?.title?.trim() || 'Admin Home';

  return (
    <main
      className={className || 'mx-auto max-w-5xl px-4 py-8'}
    >
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">
          Placeholder template for admin dashboard content migration.
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}

