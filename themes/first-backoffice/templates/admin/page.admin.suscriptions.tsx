import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export default function PageAdminSuscriptionsTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const title = toStringOrFallback(data?.title, 'Subscriptions');
  const description = toStringOrFallback(
    data?.description,
    'User and organization subscription operations.'
  );
  const scope = toStringOrFallback(data?.scope, 'organization');

  return (
    <main
      className={className || 'mx-auto max-w-7xl px-4 py-8'}
      data-theme-template="page.admin.suscriptions"
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

