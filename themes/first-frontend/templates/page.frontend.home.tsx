import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CreditCard,
  Database,
  Rocket,
  ShieldCheck
} from 'lucide-react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

type HomeFeatureCard = {
  title: string;
  description: string;
  icon: 'rocket' | 'database' | 'credit-card';
};

const DEFAULT_FEATURE_CARDS: HomeFeatureCard[] = [
  {
    icon: 'rocket',
    title: 'React + Next.js',
    description: 'Modern app router foundation with reusable patterns.'
  },
  {
    icon: 'database',
    title: 'Postgres + Drizzle',
    description: 'Typed database layer ready for production workflows.'
  },
  {
    icon: 'credit-card',
    title: 'Stripe + PayPal',
    description: 'Built-in checkout and subscription lifecycle support.'
  }
];

function asNonEmptyString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function asFeatureCards(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_FEATURE_CARDS;
  }

  const normalized = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const iconValue = asNonEmptyString(entry.icon, '').toLowerCase();
      const icon =
        iconValue === 'rocket' ||
        iconValue === 'database' ||
        iconValue === 'credit-card'
          ? iconValue
          : 'rocket';

      return {
        icon,
        title: asNonEmptyString(entry.title, ''),
        description: asNonEmptyString(entry.description, '')
      } satisfies HomeFeatureCard;
    })
    .filter(
      (item): item is HomeFeatureCard =>
        Boolean(item && item.title) && Boolean(item && item.description)
    );

  return normalized.length > 0 ? normalized : DEFAULT_FEATURE_CARDS;
}

function resolveFeatureIcon(icon: HomeFeatureCard['icon']) {
  if (icon === 'database') {
    return Database;
  }

  if (icon === 'credit-card') {
    return CreditCard;
  }

  return Rocket;
}

export default function PageFrontendHomeTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const badge = asNonEmptyString(data?.badge, 'SaaS Starter');
  const heroTitleLine1 = asNonEmptyString(data?.heroTitleLine1, 'Build');
  const heroTitleLine2 = asNonEmptyString(data?.heroTitleLine2, 'Faster');
  const heroDescription = asNonEmptyString(
    data?.heroDescription,
    'Production-ready SaaS foundation.'
  );
  const viewCodeLabel = asNonEmptyString(data?.viewCodeLabel, 'View Code');
  const featureLabel = asNonEmptyString(data?.featureLabel, 'Features');
  const featureHighlightOne = asNonEmptyString(
    data?.featureHighlightOne,
    'React + Next.js'
  );
  const featureHighlightTwo = asNonEmptyString(
    data?.featureHighlightTwo,
    'Postgres + Drizzle'
  );
  const featureHighlightThree = asNonEmptyString(
    data?.featureHighlightThree,
    'Stripe + PayPal'
  );
  const showcaseTitle = asNonEmptyString(data?.showcaseTitle, 'Platform capabilities');
  const securityLabel = asNonEmptyString(data?.securityLabel, 'Security');
  const securityValue = asNonEmptyString(data?.securityValue, 'Role-based access');
  const billingLabel = asNonEmptyString(data?.billingLabel, 'Billing');
  const billingValue = asNonEmptyString(data?.billingValue, 'Pricing');
  const ctaTitle = asNonEmptyString(data?.ctaTitle, 'Ready to launch?');
  const ctaDescription = asNonEmptyString(
    data?.ctaDescription,
    'Take the starter and ship the next SaaS release.'
  );
  const pricingLabel = asNonEmptyString(data?.pricingLabel, 'Pricing');
  const viewCodeHref = asNonEmptyString(
    data?.viewCodeHref,
    'https://github.com/Samleinav/s-kit-saas'
  );
  const featureCards = asFeatureCards(data?.featureCards);

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.home"
    >
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8 animate-[marketing-rise_650ms_ease-out]">
          <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
            {badge}
          </span>

          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-[1.05] text-zinc-100 sm:text-6xl lg:text-7xl">
              {heroTitleLine1}
              <span className="marketing-text-gradient block italic">
                {heroTitleLine2}
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              {heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a href={viewCodeHref} target="_blank" rel="noreferrer">
              <span className="inline-flex h-12 items-center rounded-sm border border-zinc-700 bg-zinc-900/70 px-6 text-[11px] tracking-[0.18em] text-zinc-100 uppercase transition-colors hover:border-amber-200/40 hover:bg-zinc-900 hover:text-amber-100">
                {viewCodeLabel}
              </span>
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="theme-first-frontend-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">01</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{featureHighlightOne}</p>
            </div>
            <div className="theme-first-frontend-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">02</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{featureHighlightTwo}</p>
            </div>
            <div className="theme-first-frontend-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">03</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {featureHighlightThree}
              </p>
            </div>
          </div>
        </div>

        <div className="relative animate-[marketing-rise_900ms_ease-out]">
          <div className="pointer-events-none absolute inset-0 m-auto h-[26rem] w-[26rem] rounded-full border border-amber-200/10 animate-[marketing-spin_32s_linear_infinite]" />
          <div className="pointer-events-none absolute inset-0 m-auto h-56 w-56 rounded-full border border-amber-200/20 border-dashed animate-[marketing-spin_18s_linear_infinite_reverse]" />
          <div className="pointer-events-none absolute inset-0 m-auto h-44 w-44 rounded-full bg-amber-200/10 blur-3xl animate-[marketing-pulse_5s_ease-in-out_infinite]" />

          <div className="theme-first-frontend-panel relative overflow-hidden rounded-2xl border border-amber-200/20 p-4">
            {children}
          </div>

          <div className="theme-first-frontend-panel absolute -top-5 right-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[marketing-float_8s_ease-in-out_infinite]">
            <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              {securityLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-100" />
              <p className="text-sm font-medium text-zinc-100">{securityValue}</p>
            </div>
          </div>

          <div className="theme-first-frontend-panel absolute -bottom-6 left-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[marketing-float_8s_ease-in-out_infinite_1.4s]">
            <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              {billingLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-100" />
              <p className="text-sm font-medium text-zinc-100">{billingValue}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mt-24 space-y-6">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {featureLabel}
          </p>
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
            {showcaseTitle}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = resolveFeatureIcon(feature.icon);
            return (
              <article
                key={`${feature.icon}:${feature.title}`}
                className="theme-first-frontend-panel relative overflow-hidden rounded-2xl p-6"
              >
                <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-amber-200/10 blur-2xl" />
                <span className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/10 text-amber-100">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="relative text-xl font-semibold text-zinc-100">
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-24">
        <div className="theme-first-frontend-panel overflow-hidden rounded-3xl p-8 sm:p-10">
          <div className="pointer-events-none absolute top-0 right-0 h-36 w-36 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100 sm:text-4xl">
                {ctaTitle}
              </h2>
              <p className="max-w-3xl text-base text-zinc-400">{ctaDescription}</p>
            </div>
            <Link href="/pricing">
              <span className="inline-flex h-12 items-center rounded-sm border border-amber-200/30 bg-amber-200/10 px-6 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black">
                {pricingLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
