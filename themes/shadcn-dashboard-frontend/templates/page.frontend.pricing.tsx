import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function asNonEmptyString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export default function PageFrontendPricingTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const badgeLabel = asNonEmptyString(data?.badgeLabel, 'Pricing');
  const title = asNonEmptyString(data?.title, 'Plans for every stage');
  const subtitle = asNonEmptyString(
    data?.subtitle,
    'Choose the plan that fits your product and scale when needed.'
  );

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.pricing"
    >
      <section className="mb-10 space-y-4 animate-[theme-shadcn-dashboard-rise_620ms_ease-out]">
        <span className="theme-shadcn-dashboard-panel theme-shadcn-dashboard-kicker inline-flex items-center rounded-full px-4 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-100">
          {badgeLabel}
        </span>
        <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl dark:text-slate-100">
          <span className="theme-shadcn-dashboard-title-gradient">{title}</span>
        </h1>
        <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300">
          {subtitle}
        </p>
      </section>

      <section className="theme-shadcn-dashboard-panel rounded-2xl p-4 sm:p-6">
        {children}
      </section>
    </main>
  );
}
