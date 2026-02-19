import type { ReactNode } from 'react';

type TemplateData = {
  description?: string;
  title?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function PageDashboardSubscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = data?.title?.trim() || 'Subscriptions';
  const description = data?.description?.trim() || 'Manage plans, organizations, and billing events.';
  return (
    <main className={className || 'mx-auto max-w-7xl px-4 py-8'}>
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-sm opacity-80">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}