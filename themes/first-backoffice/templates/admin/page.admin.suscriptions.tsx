import type { ReactNode } from 'react';

type TemplateData = {
  description?: string;
  scope?: string;
  title?: string;
};

type TemplateProps = {
  data?: TemplateData;
  className?: string;
  children?: ReactNode;
};

export default function PageAdminSuscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = data?.title?.trim() || 'Subscriptions';
  const description = data?.description?.trim() || 'User and organization subscription operations.';
  const scope = data?.scope?.trim() || 'organization';

  return (
    <main
      className={className || 'mx-auto max-w-7xl px-4 py-8'}
      data-subscription-scope={scope}
    >
      <section className="theme-first-backoffice-panel rounded-xl p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm opacity-80">{description}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </section>
    </main>
  );
}


