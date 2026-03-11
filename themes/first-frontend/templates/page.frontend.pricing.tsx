'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@skitsaas/sdk';
import { Boxes, Check, UserRound, Users } from 'lucide-react';

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

type DemoPricingCard = {
  title: string;
  priceLabel: string;
  footerKey: string;
  noteKeys: readonly string[];
  descriptionKey?: string;
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

function DemoPricingSection({
  id,
  icon,
  title,
  description,
  cards,
  t
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  cards: readonly DemoPricingCard[];
  t: (key: string) => string;
}) {
  return (
    <section id={id} className="space-y-6">
      <div className="max-w-3xl space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
          {icon}
          {title}
        </span>
        <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
          {description}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {cards.map((card, index) => (
          <article
            key={`${id}:${card.title}`}
            className="theme-first-frontend-panel relative overflow-hidden rounded-[1.75rem] p-6"
          >
            <div
              className={`pointer-events-none absolute -right-10 -top-8 h-28 w-28 rounded-full blur-3xl ${
                index === 0
                  ? 'bg-amber-200/12'
                  : index === 1
                    ? 'bg-yellow-100/10'
                    : 'bg-orange-200/10'
              }`}
            />

            <div className="relative flex h-full flex-col">
              <div className="space-y-3">
                <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                  {title}
                </p>
                <h3 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
                  {card.title}
                </h3>
                {card.descriptionKey ? (
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {t(card.descriptionKey)}
                  </p>
                ) : null}
              </div>

              <div className="mt-8">
                <p className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100">
                  {card.priceLabel}
                </p>
                <p className="mt-2 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">
                  {t(card.footerKey)}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {card.noteKeys.map((noteKey) => (
                  <span
                    key={`${card.title}:${noteKey}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-zinc-200"
                  >
                    <Check className="h-3.5 w-3.5 text-amber-100" />
                    {t(noteKey)}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
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
  const userPricingDemos: readonly DemoPricingCard[] = [
    {
      title: 'Solo',
      priceLabel: '$12',
      footerKey: 'USD / user',
      noteKeys: ['1 seat', 'Personal workspace', 'Email support']
    },
    {
      title: 'Studio',
      priceLabel: '$24',
      footerKey: 'USD / user',
      noteKeys: ['5 seats', 'Shared workspace', 'Priority inbox']
    },
    {
      title: 'Scale',
      priceLabel: '$49',
      footerKey: 'USD / user',
      noteKeys: ['25 seats', 'Advanced roles', 'Launch support']
    }
  ];
  const teamPricingDemos: readonly DemoPricingCard[] = [
    {
      title: 'Core Team',
      priceLabel: '$89',
      footerKey: 'USD / team',
      noteKeys: ['1 team', 'Shared billing', 'Member roles']
    },
    {
      title: 'Ops Team',
      priceLabel: '$169',
      footerKey: 'USD / team',
      noteKeys: ['3 teams', 'Usage review', 'Ops handoff']
    },
    {
      title: 'Scale Team',
      priceLabel: '$329',
      footerKey: 'USD / team',
      noteKeys: ['10 teams', 'Multi-team rollout', 'Priority support']
    }
  ];
  const categoryPricingDemos: readonly DemoPricingCard[] = [
    {
      title: t('Free'),
      priceLabel: t('Free forever'),
      footerKey: 'Pack line',
      descriptionKey:
        'The full SKSS open-source core so you can self-host, extend, and ship on your own roadmap.',
      noteKeys: [
        'Full open-source SKSS host',
        'Editable core source code',
        'Build your own modules and product flows'
      ]
    },
    {
      title: t('Commercial SaaS'),
      priceLabel: t('Coming Soon'),
      footerKey: 'Pack line',
      descriptionKey:
        'Support, ready-to-use modules, and a commercial license for one SaaS product.',
      noteKeys: [
        'Commercial support and implementation guidance',
        'Ready-to-use commercial modules',
        'License for 1 SaaS'
      ]
    },
    {
      title: t('Enterprise'),
      priceLabel: t('Coming Soon'),
      footerKey: 'Pack line',
      descriptionKey:
        'Enterprise support plus premium modules like SSO, ChatAI, Email Pro, and other ready-to-use add-ons.',
      noteKeys: [
        'SSO, ChatAI, and Email Pro modules',
        'Enterprise ready-to-use module pack',
        'Priority rollout and architecture support'
      ]
    }
  ];

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

      <div className="mt-12 space-y-16">
        <section className="space-y-5">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-medium tracking-[0.18em] text-zinc-200 uppercase">
              {t('Demo subscription layouts')}
            </span>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t(
                'This pricing page can showcase live subscription templates and multiple presentation patterns at the same time.'
              )}
            </p>
          </div>
        </section>

        <DemoPricingSection
          id="demo-by-user"
          icon={<UserRound className="h-3.5 w-3.5" />}
          title={t('By user')}
          description={t(
            'Seat-based pricing for products that scale one user at a time.'
          )}
          cards={userPricingDemos}
          t={t}
        />

        <DemoPricingSection
          id="demo-by-team"
          icon={<Users className="h-3.5 w-3.5" />}
          title={t('By team')}
          description={t(
            'Workspace pricing for teams that buy access as a shared operating unit.'
          )}
          cards={teamPricingDemos}
          t={t}
        />

        <DemoPricingSection
          id="demo-by-category"
          icon={<Boxes className="h-3.5 w-3.5" />}
          title={t('By category')}
          description={t(
            'Commercial-line comparison that folds the /packs story into pricing.'
          )}
          cards={categoryPricingDemos}
          t={t}
        />

        <section id="live-subscriptions" className="space-y-5">
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

          {children}
        </section>
      </div>
    </main>
  );
}
