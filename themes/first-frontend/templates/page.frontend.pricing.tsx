import type { ReactNode } from 'react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function PageFrontendPricingTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const badgeLabel =
    typeof data?.badgeLabel === 'string' && data.badgeLabel.trim().length > 0
      ? data.badgeLabel
      : 'Pricing';
  const title =
    typeof data?.title === 'string' && data.title.trim().length > 0
      ? data.title
      : 'Pricing';
  const subtitle =
    typeof data?.subtitle === 'string' && data.subtitle.trim().length > 0
      ? data.subtitle
      : 'Template scaffold for plan cards and checkout actions.';

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.pricing"
    >
      <section className="mb-10 space-y-4 animate-[marketing-rise_650ms_ease-out]">
        <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
          {badgeLabel}
        </span>
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-tight text-zinc-100 sm:text-6xl">
          {title}
        </h1>
        <p className="max-w-3xl text-base text-zinc-400">{subtitle}</p>
      </section>

      {children}
    </main>
  );
}
