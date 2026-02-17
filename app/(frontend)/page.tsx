import Link from 'next/link';
import { type ComponentType } from 'react';
import {
  ArrowRight,
  CreditCard,
  Database,
  Rocket,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { Terminal } from './terminal';
import { getServerMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

type FeatureCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <article className="marketing-panel relative overflow-hidden rounded-2xl p-6">
      <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-amber-200/10 blur-2xl" />
      <span className="relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/10 text-amber-100">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="relative text-xl font-semibold text-zinc-100">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">
        {description}
      </p>
    </article>
  );
}

export default async function HomePage() {
  const messages = await getServerMessages('global');
  const { header, home } = messages;

  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8 animate-[marketing-rise_650ms_ease-out]">
          <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
            {home.badge}
          </span>

          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-[1.05] text-zinc-100 sm:text-6xl lg:text-7xl">
              {home.hero.titleLine1}
              <span className="marketing-text-gradient block italic">
                {home.hero.titleLine2}
              </span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              {home.hero.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
                        <a
              href="https://github.com/Samleinav/s-kit-saas"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                variant="outline"
                className="h-12 rounded-sm border-zinc-700 bg-zinc-900/70 px-6 text-[11px] tracking-[0.18em] text-zinc-100 uppercase hover:border-amber-200/40 hover:bg-zinc-900 hover:text-amber-100"
              >
                {home.cta.viewCodeButton}
              </Button>
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="marketing-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                01
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {home.features.reactTitle}
              </p>
            </div>
            <div className="marketing-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                02
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {home.features.dbTitle}
              </p>
            </div>
            <div className="marketing-panel rounded-xl p-4">
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                03
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {home.features.stripeTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="relative animate-[marketing-rise_900ms_ease-out]">
          <div className="pointer-events-none absolute inset-0 m-auto h-[26rem] w-[26rem] rounded-full border border-amber-200/10 animate-[marketing-spin_32s_linear_infinite]" />
          <div className="pointer-events-none absolute inset-0 m-auto h-56 w-56 rounded-full border border-amber-200/20 border-dashed animate-[marketing-spin_18s_linear_infinite_reverse]" />
          <div className="pointer-events-none absolute inset-0 m-auto h-44 w-44 rounded-full bg-amber-200/10 blur-3xl animate-[marketing-pulse_5s_ease-in-out_infinite]" />

          <div className="marketing-panel relative overflow-hidden rounded-2xl border border-amber-200/20 p-4">
            <Terminal />
          </div>

          <div className="marketing-panel absolute -top-5 right-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[marketing-float_8s_ease-in-out_infinite]">
            <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              {home.showcase.securityLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-100" />
              <p className="text-sm font-medium text-zinc-100">
                {home.showcase.securityValue}
              </p>
            </div>
          </div>

          <div className="marketing-panel absolute -bottom-6 left-0 hidden max-w-[220px] rounded-xl p-4 md:block animate-[marketing-float_8s_ease-in-out_infinite_1.4s]">
            <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
              {home.showcase.billingLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-100" />
              <p className="text-sm font-medium text-zinc-100">
                {header.pricing}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mt-24 space-y-6">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {header.features}
          </p>
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
            {home.showcase.sectionTitle}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={Rocket}
            title={home.features.reactTitle}
            description={home.features.reactDescription}
          />
          <FeatureCard
            icon={Database}
            title={home.features.dbTitle}
            description={home.features.dbDescription}
          />
          <FeatureCard
            icon={CreditCard}
            title={home.features.stripeTitle}
            description={home.features.stripeDescription}
          />
        </div>
      </section>

      <section className="mt-24">
        <div className="marketing-panel overflow-hidden rounded-3xl p-8 sm:p-10">
          <div className="pointer-events-none absolute top-0 right-0 h-36 w-36 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100 sm:text-4xl">
                {home.cta.title}
              </h2>
              <p className="max-w-3xl text-base text-zinc-400">
                {home.cta.description}
              </p>
            </div>
            <Link href="/pricing">
              <Button className="h-12 rounded-sm border border-amber-200/30 bg-amber-200/10 px-6 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black">
                {header.pricing}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );

  const themeSelection = await getThemeSelectionForArea('frontend');
  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeFrontendRoute
      path="/"
      themeId={themeSelection.themeKey}
      data={{
        badge: home.badge,
        heroTitleLine1: home.hero.titleLine1,
        heroTitleLine2: home.hero.titleLine2,
        heroDescription: home.hero.description,
        viewCodeLabel: home.cta.viewCodeButton,
        featureLabel: header.features,
        featureHighlightOne: home.features.reactTitle,
        featureHighlightTwo: home.features.dbTitle,
        featureHighlightThree: home.features.stripeTitle,
        showcaseTitle: home.showcase.sectionTitle,
        securityLabel: home.showcase.securityLabel,
        securityValue: home.showcase.securityValue,
        billingLabel: home.showcase.billingLabel,
        billingValue: header.pricing,
        ctaTitle: home.cta.title,
        ctaDescription: home.cta.description,
        pricingLabel: header.pricing,
        viewCodeHref: 'https://github.com/Samleinav/s-kit-saas',
        featureCards: [
          {
            icon: 'rocket',
            title: home.features.reactTitle,
            description: home.features.reactDescription
          },
          {
            icon: 'database',
            title: home.features.dbTitle,
            description: home.features.dbDescription
          },
          {
            icon: 'credit-card',
            title: home.features.stripeTitle,
            description: home.features.stripeDescription
          }
        ]
      }}
      fallback={fallbackPage}
    >
      <Terminal />
    </ThemeFrontendRoute>
  );
}
