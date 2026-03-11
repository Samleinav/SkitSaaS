'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@skitsaas/sdk';
import {
  ArrowRight,
  Blocks,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  Layers3,
  Minus,
  ShieldCheck
} from 'lucide-react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

type PackTone = 'free' | 'commercial' | 'enterprise';
type PackFeature = {
  labelKey: string;
  tone?: 'positive' | 'neutral';
};

type PackCard = {
  tone: PackTone;
  eyebrowKey: string;
  titleKey: string;
  priceKey: string;
  descriptionKey: string;
  featureKeys: readonly PackFeature[];
  badgeKeys: readonly string[];
};

type ComparisonCell = {
  valueKey: string;
  tone: 'positive' | 'negative' | 'neutral';
};

type ComparisonRow = {
  labelKey: string;
  free: ComparisonCell;
  commercial: ComparisonCell;
  enterprise: ComparisonCell;
};

type VariantRow = {
  labelKey: string;
  normalKey: string;
  sourceCodeKey: string;
};

type OfferVariant = {
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
};

const PACKS: readonly PackCard[] = [
  {
    tone: 'free',
    eyebrowKey: 'Open-source core',
    titleKey: 'Free',
    priceKey: 'Free forever',
    descriptionKey:
      'The full SKSS open-source core so you can self-host, extend, and ship on your own roadmap.',
    featureKeys: [
      { labelKey: 'Full open-source SKSS host', tone: 'positive' },
      { labelKey: 'Editable core source code', tone: 'positive' },
      { labelKey: 'Build your own modules and product flows', tone: 'positive' }
    ],
    badgeKeys: ['Open Source', 'Self-hosted', 'Source included']
  },
  {
    tone: 'commercial',
    eyebrowKey: 'Commercial SaaS',
    titleKey: 'Commercial SaaS',
    priceKey: 'Coming Soon',
    descriptionKey:
      'Support, ready-to-use modules, and a commercial license for one SaaS product.',
    featureKeys: [
      { labelKey: 'Commercial support and implementation guidance', tone: 'positive' },
      { labelKey: 'Ready-to-use commercial modules', tone: 'positive' },
      { labelKey: 'License for 1 SaaS', tone: 'positive' }
    ],
    badgeKeys: ['Modules Normal', 'Modules Source Code', '1 SaaS license']
  },
  {
    tone: 'enterprise',
    eyebrowKey: 'Enterprise',
    titleKey: 'Enterprise',
    priceKey: 'Coming Soon',
    descriptionKey:
      'Enterprise support plus premium modules like SSO, ChatAI, Email Pro, and other ready-to-use add-ons.',
    featureKeys: [
      { labelKey: 'SSO, ChatAI, and Email Pro modules', tone: 'positive' },
      { labelKey: 'Enterprise ready-to-use module pack', tone: 'positive' },
      { labelKey: 'Priority rollout and architecture support', tone: 'positive' }
    ],
    badgeKeys: ['SSO', 'ChatAI', 'Email Pro']
  }
] as const;

const FAMILY_COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    labelKey: 'SKSS core',
    free: { valueKey: 'Included with source access', tone: 'positive' },
    commercial: { valueKey: 'Included with commercial enablement', tone: 'positive' },
    enterprise: { valueKey: 'Included with enterprise enablement', tone: 'positive' }
  },
  {
    labelKey: 'Ready-to-use modules',
    free: { valueKey: 'Community-built only', tone: 'neutral' },
    commercial: { valueKey: 'Selected commercial pack', tone: 'positive' },
    enterprise: { valueKey: 'Expanded enterprise pack', tone: 'positive' }
  },
  {
    labelKey: 'Support',
    free: { valueKey: 'Community or self-managed', tone: 'neutral' },
    commercial: { valueKey: 'Commercial support', tone: 'positive' },
    enterprise: { valueKey: 'Priority enterprise support', tone: 'positive' }
  },
  {
    labelKey: 'License scope',
    free: { valueKey: 'Open-source core usage', tone: 'neutral' },
    commercial: { valueKey: '1 SaaS license', tone: 'positive' },
    enterprise: { valueKey: 'Enterprise agreement', tone: 'positive' }
  },
  {
    labelKey: 'SSO module',
    free: { valueKey: 'Not included', tone: 'negative' },
    commercial: { valueKey: 'Not included', tone: 'negative' },
    enterprise: { valueKey: 'Included', tone: 'positive' }
  },
  {
    labelKey: 'ChatAI module',
    free: { valueKey: 'Not included', tone: 'negative' },
    commercial: { valueKey: 'Not included', tone: 'negative' },
    enterprise: { valueKey: 'Included', tone: 'positive' }
  },
  {
    labelKey: 'Email Pro module',
    free: { valueKey: 'Not included', tone: 'negative' },
    commercial: { valueKey: 'Not included', tone: 'negative' },
    enterprise: { valueKey: 'Included', tone: 'positive' }
  },
  {
    labelKey: 'Delivery modes',
    free: { valueKey: 'Open-source source code', tone: 'neutral' },
    commercial: { valueKey: 'Modules Normal or Modules Source Code', tone: 'positive' },
    enterprise: { valueKey: 'Modules Normal or Modules Source Code', tone: 'positive' }
  }
] as const;

const VARIANT_ROWS: readonly VariantRow[] = [
  {
    labelKey: 'How premium modules are delivered',
    normalKey: 'Compiled module packages',
    sourceCodeKey: 'Readable source packages'
  },
  {
    labelKey: 'Can you edit the premium module code?',
    normalKey:
      'Not in a practical way unless you reverse-engineer the compiled JavaScript output.',
    sourceCodeKey: 'Yes, with full source-level customization.'
  },
  {
    labelKey: 'Best fit',
    normalKey: 'Teams that want fast installs and managed upgrades.',
    sourceCodeKey: 'Teams that need audits, forks, and deep product customization.'
  },
  {
    labelKey: 'Available on',
    normalKey: 'Commercial SaaS and Enterprise',
    sourceCodeKey: 'Commercial SaaS and Enterprise'
  }
] as const;

const OFFER_VARIANTS: readonly OfferVariant[] = [
  {
    eyebrowKey: 'Commercial SaaS',
    titleKey: 'Commercial SaaS / Modules Normal',
    descriptionKey:
      'Compiled commercial modules with support and a license for one SaaS product.'
  },
  {
    eyebrowKey: 'Commercial SaaS',
    titleKey: 'Commercial SaaS / Modules Source Code',
    descriptionKey:
      'Commercial support plus editable source access for the premium module pack.'
  },
  {
    eyebrowKey: 'Enterprise',
    titleKey: 'Enterprise / Modules Normal',
    descriptionKey:
      'Compiled enterprise modules including SSO, ChatAI, Email Pro, and rollout guidance.'
  },
  {
    eyebrowKey: 'Enterprise',
    titleKey: 'Enterprise / Modules Source Code',
    descriptionKey:
      'Enterprise-grade premium modules with readable source code for deep customization.'
  }
] as const;

function resolvePackIcon(tone: PackTone) {
  if (tone === 'commercial') {
    return BriefcaseBusiness;
  }

  if (tone === 'enterprise') {
    return Building2;
  }

  return Blocks;
}

function renderCellTone(
  tone: ComparisonCell['tone'],
  t: (key: string) => string
) {
  if (tone === 'positive') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
        <Check className="h-3.5 w-3.5" />
        <span className="sr-only">{t('Included')}</span>
      </span>
    );
  }

  if (tone === 'negative') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400">
        <Minus className="h-3.5 w-3.5" />
        <span className="sr-only">{t('Not included')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-200/15 bg-amber-200/10 text-amber-100">
      <Layers3 className="h-3.5 w-3.5" />
      <span className="sr-only">{t('Available')}</span>
    </span>
  );
}

export default function PageFrontendPacksTemplate({
  className,
  themeId
}: TemplateProps) {
  const t = useI18n({ themeId, area: 'frontend' });

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.packs"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/15 bg-[linear-gradient(145deg,rgba(20,20,20,0.92)_0%,rgba(8,8,8,0.9)_55%,rgba(20,16,10,0.94)_100%)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-amber-200/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-amber-200/8 blur-3xl" />

        <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <div className="space-y-8 animate-[marketing-rise_650ms_ease-out]">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
                {t('Packs')}
              </span>
              <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-[1.05] text-zinc-100 sm:text-6xl">
                {t('Choose how you want to adopt SKSS.')}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                {t(
                  'Start with the open-source core, then move into commercial or enterprise packs when you need premium modules, support, and licensing.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#pack-comparison"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium tracking-[0.18em] text-zinc-200 uppercase transition hover:border-amber-200/30 hover:bg-amber-200/10 hover:text-amber-50"
              >
                {t('Compare packs')}
              </a>
              <a
                href="#delivery-modes"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium tracking-[0.18em] text-zinc-200 uppercase transition hover:border-amber-200/30 hover:bg-amber-200/10 hover:text-amber-50"
              >
                {t('Delivery modes')}
              </a>
            </div>
          </div>

          <aside className="theme-first-frontend-panel rounded-[1.75rem] p-5 animate-[marketing-rise_850ms_ease-out]">
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                  {t('Open-source core')}
                </p>
                <p className="mt-3 font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
                  {t('Free')}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {t('Start with the full open-source SKSS foundation today.')}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                  {t('Paid lines')}
                </p>
                <p className="mt-3 text-lg font-medium text-zinc-100">
                  {t('Commercial SaaS + Enterprise')}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {t(
                    'Both paid lines will be offered in Modules Normal and Modules Source Code variants.'
                  )}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-amber-200/15 bg-amber-200/10 p-4">
                <div className="flex items-start gap-3">
                  <Code2 className="mt-0.5 h-4 w-4 text-amber-100" />
                  <p className="text-xs leading-relaxed text-zinc-200">
                    {t(
                      'SKSS supports compiled modules, so the normal premium variants can be installed without exposing readable source code.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        {PACKS.map((pack, index) => {
          const Icon = resolvePackIcon(pack.tone);

          return (
            <article
              key={pack.titleKey}
              className="theme-first-frontend-panel relative overflow-hidden rounded-[1.75rem] p-6"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-8 h-32 w-32 rounded-full blur-3xl ${
                  index === 0
                    ? 'bg-amber-200/12'
                    : index === 1
                      ? 'bg-yellow-100/10'
                      : 'bg-orange-200/10'
                }`}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                    {t(pack.eyebrowKey)}
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
                    {t(pack.titleKey)}
                  </h2>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/10 text-amber-100">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-5 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase">
                {t(pack.priceKey)}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {t(pack.descriptionKey)}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {pack.badgeKeys.map((badgeKey) => (
                  <span
                    key={badgeKey}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] tracking-[0.16em] text-zinc-300 uppercase"
                  >
                    {t(badgeKey)}
                  </span>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {pack.featureKeys.map((feature) => (
                  <div key={feature.labelKey} className="flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-200/15 bg-amber-200/10 text-amber-100">
                      {feature.tone === 'positive' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <p className="text-sm leading-relaxed text-zinc-200">
                      {t(feature.labelKey)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section id="pack-comparison" className="mt-16 space-y-5">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {t('Pack comparison')}
          </p>
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
            {t('See the practical difference between the free core and the paid pack lines.')}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t(
              'The open-source core stays free. Paid lines add support, licensing, and premium ready-to-use modules on top.'
            )}
          </p>
        </div>

        <div className="theme-first-frontend-panel overflow-hidden rounded-[1.75rem]">
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Capability')}
                  </th>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Free')}
                  </th>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Commercial SaaS')}
                  </th>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Enterprise')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {FAMILY_COMPARISON_ROWS.map((row) => (
                  <tr key={row.labelKey} className="border-t border-white/10">
                    <th className="px-5 py-4 text-left text-sm font-medium text-zinc-100">
                      {t(row.labelKey)}
                    </th>
                    {[row.free, row.commercial, row.enterprise].map((cell) => (
                      <td key={`${row.labelKey}:${cell.valueKey}`} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {renderCellTone(cell.tone, t)}
                          <p className="text-sm leading-relaxed text-zinc-300">
                            {t(cell.valueKey)}
                          </p>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="delivery-modes" className="mt-16 space-y-5">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {t('Delivery mode comparison')}
          </p>
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
            {t('Modules Normal or Modules Source Code, depending on how much control you need.')}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t(
              'SKSS can distribute premium modules as compiled packages. Choose the source-code variant when you need readable code and deep edits.'
            )}
          </p>
        </div>

        <div className="theme-first-frontend-panel overflow-hidden rounded-[1.75rem]">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Attribute')}
                  </th>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Modules Normal')}
                  </th>
                  <th className="px-5 py-4 text-left text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                    {t('Modules Source Code')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {VARIANT_ROWS.map((row) => (
                  <tr key={row.labelKey} className="border-t border-white/10">
                    <th className="px-5 py-4 text-left text-sm font-medium text-zinc-100">
                      {t(row.labelKey)}
                    </th>
                    <td className="px-5 py-4 text-sm leading-relaxed text-zinc-300">
                      {t(row.normalKey)}
                    </td>
                    <td className="px-5 py-4 text-sm leading-relaxed text-zinc-300">
                      {t(row.sourceCodeKey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-16 space-y-5">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {t('Commercial and enterprise variants')}
          </p>
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
            {t('Planned paid offers')}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t('Every paid variant is currently marked as Coming Soon while pricing is prepared.')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {OFFER_VARIANTS.map((offer) => (
            <article
              key={offer.titleKey}
              className="theme-first-frontend-panel rounded-[1.5rem] p-6"
            >
              <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                {t(offer.eyebrowKey)}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-zinc-100">
                {t(offer.titleKey)}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {t(offer.descriptionKey)}
              </p>
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase">
                  {t('Coming Soon')}
                </span>
                <span className="text-[11px] tracking-[0.18em] text-zinc-500 uppercase">
                  {t('Pricing pending')}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="theme-first-frontend-panel overflow-hidden rounded-3xl p-8 sm:p-10">
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100 sm:text-4xl">
                {t('Start with the free core now, then upgrade when the commercial line opens.')}
              </h2>
              <p className="max-w-3xl text-base text-zinc-400">
                {t(
                  'Use pricing for the current self-service subscriptions, or read the docs to understand the SKSS architecture and extension model.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/pricing">
                <span className="inline-flex h-12 items-center rounded-sm border border-amber-200/30 bg-amber-200/10 px-6 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black">
                  {t('Pricing')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
              <Link href="/docs">
                <span className="inline-flex h-12 items-center rounded-sm border border-white/10 bg-white/5 px-6 text-[11px] font-semibold tracking-[0.18em] text-zinc-100 uppercase transition-colors hover:border-amber-200/30 hover:bg-amber-200/10 hover:text-amber-100">
                  {t('Docs')}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
