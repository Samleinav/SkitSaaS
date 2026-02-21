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
    title: 'Composable frontend',
    description: 'Route-based rendering with a clean migration path.'
  },
  {
    icon: 'database',
    title: 'Production data layer',
    description: 'Typed workflows across users, teams, and subscriptions.'
  },
  {
    icon: 'credit-card',
    title: 'Payments included',
    description: 'Stripe and PayPal flows ready for checkout execution.'
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
      const rawIcon = asNonEmptyString(entry.icon, '').toLowerCase();
      const icon =
        rawIcon === 'rocket' ||
        rawIcon === 'database' ||
        rawIcon === 'credit-card'
          ? rawIcon
          : 'rocket';

      return {
        icon,
        title: asNonEmptyString(entry.title, ''),
        description: asNonEmptyString(entry.description, '')
      } satisfies HomeFeatureCard;
    })
    .filter(
      (entry): entry is HomeFeatureCard =>
        Boolean(entry && entry.title && entry.description)
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
  const heroTitleLine1 = asNonEmptyString(data?.heroTitleLine1, 'Build faster');
  const heroTitleLine2 = asNonEmptyString(data?.heroTitleLine2, 'with shadcn style');
  const heroDescription = asNonEmptyString(
    data?.heroDescription,
    'A modular SaaS baseline for teams that want to ship and iterate quickly.'
  );
  const viewCodeLabel = asNonEmptyString(data?.viewCodeLabel, 'View Code');
  const featureLabel = asNonEmptyString(data?.featureLabel, 'Features');
  const featureHighlightOne = asNonEmptyString(
    data?.featureHighlightOne,
    'Composable routes'
  );
  const featureHighlightTwo = asNonEmptyString(
    data?.featureHighlightTwo,
    'Typed database'
  );
  const featureHighlightThree = asNonEmptyString(
    data?.featureHighlightThree,
    'Integrated billing'
  );
  const showcaseTitle = asNonEmptyString(data?.showcaseTitle, 'Platform highlights');
  const securityLabel = asNonEmptyString(data?.securityLabel, 'Security');
  const securityValue = asNonEmptyString(data?.securityValue, 'Role-based access');
  const billingLabel = asNonEmptyString(data?.billingLabel, 'Billing');
  const billingValue = asNonEmptyString(data?.billingValue, 'Pricing plans');
  const ctaTitle = asNonEmptyString(data?.ctaTitle, 'Launch your next release');
  const ctaDescription = asNonEmptyString(
    data?.ctaDescription,
    'Use this template as a baseline and customize where your product needs it.'
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
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.home"
    >
      <section className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-8 animate-[theme-shadcn-dashboard-rise_620ms_ease-out]">
          <span className="theme-shadcn-dashboard-panel theme-shadcn-dashboard-kicker inline-flex items-center rounded-full px-4 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-100">
            {badge}
          </span>

          <div className="space-y-4">
            <h1 className="text-5xl font-semibold leading-[1.06] text-slate-950 sm:text-6xl lg:text-7xl dark:text-slate-100">
              {heroTitleLine1}
              <span className="theme-shadcn-dashboard-title-gradient block">
                {heroTitleLine2}
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              {heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-[11px] font-semibold tracking-[0.16em] text-primary-foreground uppercase transition hover:opacity-90"
            >
              {pricingLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <a
              href={viewCodeHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white/70 px-5 text-[11px] font-semibold tracking-[0.16em] text-slate-900 uppercase transition hover:border-primary/40 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:border-primary/50"
            >
              {viewCodeLabel}
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="theme-shadcn-dashboard-panel rounded-xl p-4">
              <p className="theme-shadcn-dashboard-kicker text-[10px] text-slate-500 dark:text-slate-400">
                01
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {featureHighlightOne}
              </p>
            </div>
            <div className="theme-shadcn-dashboard-panel rounded-xl p-4">
              <p className="theme-shadcn-dashboard-kicker text-[10px] text-slate-500 dark:text-slate-400">
                02
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {featureHighlightTwo}
              </p>
            </div>
            <div className="theme-shadcn-dashboard-panel rounded-xl p-4">
              <p className="theme-shadcn-dashboard-kicker text-[10px] text-slate-500 dark:text-slate-400">
                03
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {featureHighlightThree}
              </p>
            </div>
          </div>
        </div>

        <div className="relative animate-[theme-shadcn-dashboard-rise_900ms_ease-out]">
          <div className="pointer-events-none absolute inset-0 m-auto h-[24rem] w-[24rem] rounded-full border border-primary/30" />
          <div className="pointer-events-none absolute inset-0 m-auto h-52 w-52 rounded-full border border-accent/40 border-dashed" />
          <div className="pointer-events-none absolute inset-0 m-auto h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="theme-shadcn-dashboard-panel relative overflow-hidden rounded-2xl p-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-2 dark:border-slate-700/60 dark:bg-slate-900/70">
              {children || (
                <div className="rounded-lg border border-dashed border-slate-300/80 bg-slate-100/80 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                  Preview content slot
                </div>
              )}
            </div>
          </div>

          <div className="theme-shadcn-dashboard-panel absolute -top-5 right-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[theme-shadcn-dashboard-float_8s_ease-in-out_infinite]">
            <p className="theme-shadcn-dashboard-kicker text-[10px] text-slate-500 dark:text-slate-400">
              {securityLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {securityValue}
              </p>
            </div>
          </div>

          <div className="theme-shadcn-dashboard-panel absolute -bottom-6 left-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[theme-shadcn-dashboard-float_8s_ease-in-out_infinite_1.4s]">
            <p className="theme-shadcn-dashboard-kicker text-[10px] text-slate-500 dark:text-slate-400">
              {billingLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {billingValue}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mt-24 space-y-6">
        <div className="max-w-3xl space-y-2">
          <p className="theme-shadcn-dashboard-kicker text-[11px] text-slate-500 dark:text-slate-400">
            {featureLabel}
          </p>
          <h2 className="text-4xl font-semibold text-slate-950 sm:text-5xl dark:text-slate-100">
            {showcaseTitle}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = resolveFeatureIcon(feature.icon);
            return (
              <article
                key={`${feature.icon}:${feature.title}`}
                className="theme-shadcn-dashboard-panel relative overflow-hidden rounded-2xl p-6"
              >
                <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-primary/18 blur-2xl" />
                <span className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="relative text-xl font-semibold text-slate-950 dark:text-slate-100">
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-24">
        <div className="theme-shadcn-dashboard-panel overflow-hidden rounded-3xl p-8 sm:p-10">
          <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl dark:text-slate-100">
                {ctaTitle}
              </h2>
              <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300">
                {ctaDescription}
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-[11px] font-semibold tracking-[0.16em] text-primary-foreground uppercase transition hover:opacity-90"
            >
              {pricingLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
