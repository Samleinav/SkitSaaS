'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@skitsaas/sdk';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

type OverviewItem = {
  id?: string;
  value?: string;
  methods?: string[];
  mode?: string;
  scheduledDateLabel?: string | null;
  periodEndAvailable?: boolean;
  hint?: string;
  label?: string;
};

type SectionLink = {
  href: string;
  id?: string;
  label?: string;
};

type ResolvedOverviewItem = {
  label: string;
  value: string;
  hint?: string;
};

function asNonEmptyString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function isOverviewItem(item: OverviewItem | null): item is OverviewItem {
  return item !== null;
}

function isSectionLink(item: SectionLink | null): item is SectionLink {
  return item !== null;
}

function isResolvedOverviewItem(
  item: ResolvedOverviewItem | null
): item is ResolvedOverviewItem {
  return item !== null;
}

function interpolate(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function asOverviewItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as OverviewItem[];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;

      const normalized: OverviewItem = {
        id: asNonEmptyString(entry.id, '') || undefined,
        value: asNonEmptyString(entry.value, '') || undefined,
        methods: asStringArray(entry.methods),
        mode: asNonEmptyString(entry.mode, '') || undefined,
        scheduledDateLabel: asNonEmptyString(entry.scheduledDateLabel, '') || null,
        periodEndAvailable: entry.periodEndAvailable === true,
        hint: asNonEmptyString(entry.hint, '') || undefined,
        label: asNonEmptyString(entry.label, '') || undefined
      };

      return normalized;
    })
    .filter(isOverviewItem);
}

function asSectionLinks(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SectionLink[];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const href = asNonEmptyString(entry.href, '');
      if (!href) {
        return null;
      }

      const normalized: SectionLink = {
        href,
        id: asNonEmptyString(entry.id, '') || undefined,
        label: asNonEmptyString(entry.label, '') || undefined
      };

      return normalized;
    })
    .filter(isSectionLink);
}

function resolveSectionLinkLabel(link: SectionLink, t: (key: string) => string) {
  if (link.label) {
    return link.label;
  }

  if (link.id === 'user-plans') {
    return t('User plans');
  }

  if (link.id === 'organization-plans') {
    return t('Organization plans');
  }

  return t('Pricing');
}

function resolveOverviewItem(
  item: OverviewItem,
  t: (key: string) => string
): ResolvedOverviewItem | null {
  if (item.id === 'user-plans') {
    return {
      label: t('User plans'),
      value: item.value ?? '00',
      hint: t(
        'For individual work, personal spaces, and lighter operations with full plan visibility.'
      )
    };
  }

  if (item.id === 'organization-plans') {
    return {
      label: t('Organization plans'),
      value: item.value ?? '00',
      hint: t('For teams that need collaboration, control, and a base built to scale.')
    };
  }

  if (item.id === 'payment-methods') {
    return {
      label: t('Payment methods'),
      value:
        item.methods && item.methods.length > 0
          ? item.methods.join(' / ')
          : t('Unavailable'),
      hint: t('Checkout methods available in this frontend.')
    };
  }

  if (item.id === 'change-mode') {
    const value =
      item.mode === 'period_end' ? t('At period end') : t('Apply now');
    const hint =
      item.hint ||
      (item.mode === 'period_end'
        ? item.periodEndAvailable && item.scheduledDateLabel
          ? interpolate(t('Schedule the change so it starts on {date}.'), {
              date: item.scheduledDateLabel
            })
          : t('Period-end scheduling is not available yet.')
        : t('Activate the new plan as soon as checkout completes.'));

    return {
      label: t('Change timing'),
      value,
      hint
    };
  }

  if (item.label && item.value) {
    return {
      label: item.label,
      value: item.value,
      hint: item.hint
    };
  }

  return null;
}

export default function PageFrontendPricingTemplate({
  data,
  className,
  children,
  themeId
}: TemplateProps) {
  const t = useI18n({ themeId, area: 'frontend' });
  const overviewItems = asOverviewItems(data?.overviewItems)
    .map((item) => resolveOverviewItem(item, t))
    .filter(isResolvedOverviewItem)
    .slice(0, 4);
  const sectionLinks = asSectionLinks(data?.sectionLinks);

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.pricing"
    >
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/15 bg-[linear-gradient(145deg,rgba(20,20,20,0.92)_0%,rgba(8,8,8,0.9)_55%,rgba(20,16,10,0.94)_100%)] px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-amber-200/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-amber-200/8 blur-3xl" />

        <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-8 animate-[marketing-rise_650ms_ease-out]">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
                {t('Pricing')}
              </span>
              <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-[1.05] text-zinc-100 sm:text-6xl">
                {t('Clear subscriptions for individual work and team growth.')}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                {t(
                  'Choose the plan that matches how you operate today and how you expect to scale next.'
                )}
              </p>
            </div>

            {sectionLinks.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {sectionLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium tracking-[0.18em] text-zinc-200 uppercase transition hover:border-amber-200/30 hover:bg-amber-200/10 hover:text-amber-50"
                  >
                    {resolveSectionLinkLabel(link, t)}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {overviewItems.length > 0 ? (
            <aside className="marketing-panel rounded-[1.75rem] p-5 animate-[marketing-rise_850ms_ease-out]">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {overviewItems.map((item) => {
                  const valueClassName =
                    item.value.length > 12
                      ? 'text-lg'
                      : item.value.length > 6
                        ? 'text-2xl'
                        : 'text-3xl';

                  return (
                    <div
                      key={`${item.label}:${item.value}`}
                      className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                        {item.label}
                      </p>
                      <p
                        className={`mt-3 font-[family-name:var(--font-marketing-serif)] font-medium text-zinc-100 ${valueClassName}`}
                      >
                        {item.value}
                      </p>
                      {item.hint ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                          {item.hint}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <section id="live-subscriptions" className="mt-14 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-medium tracking-[0.18em] text-zinc-200 uppercase">
              {t('Current subscription templates')}
            </span>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t(
                'The live templates below come from the current host configuration.'
              )}
            </p>
          </div>
        </div>

        <div className="space-y-16">{children}</div>
      </section>
    </main>
  );
}
