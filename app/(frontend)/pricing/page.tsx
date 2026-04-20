import Link from 'next/link';
import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { isStripeConfigured } from '@/lib/payments/stripe';
import { isPayPalConfigured } from '@/lib/payments/paypal';
import { cacheLife } from 'next/cache';
import { SubmitButton } from './submit-button';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { cn } from '@/lib/utils';
import {
  getActiveUserSubscriptionAssignment,
  getAllSubscriptionTemplatesForPricing,
  getTeamForUser,
  getUser
} from '@/lib/db/queries';
import {
  classifySubscriptionPlanRelation,
  type SubscriptionPlanRelation,
  type SubscriptionPlanTemplateLike
} from '@/lib/payments/subscription-policy';
import {
  filterSelfServiceSubscriptionTemplates,
  supportsSelfServiceSubscriptionTemplateScope
} from '@/lib/payments/subscription-scope';
import { areTeamsEnabled } from '@/lib/organizations/config';
import {
  createMarketingPricingCopy,
  type MarketingPricingMessages
} from './i18n';

type PricingTemplate = {
  id: number;
  name: string;
  targetScope: string;
  categoryKey: string;
  hierarchyRank: number;
  billingInterval: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
  trialPeriodDays: number;
  features: Array<{
    id: number;
    key: string;
    label: string;
    valueType: string;
    value: string | null;
    valueLabel: string | null;
    isPublic: boolean;
    displayOrder: number;
  }>;
};

const BILLING_INTERVAL_DISPLAY_ORDER: Record<string, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  quarterly: 3,
  semiannual: 4,
  yearly: 5
};

function interpolate(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

function formatMoney(amountInCents: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInCents / 100);
  } catch {
    return `${currency} ${(amountInCents / 100).toFixed(2)}`;
  }
}

function formatDateLabel(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(value);
}

function getDiscountPercent(priceCents: number, compareAtPriceCents: number | null) {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) {
    return null;
  }

  return Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100);
}

function formatPublicFeature(feature: {
  label: string;
  valueType: string;
  value: string | null;
  valueLabel: string | null;
}) {
  const featureLabel = feature.label.trim();
  if (!featureLabel) {
    return null;
  }

  if (feature.valueType === 'null') {
    return featureLabel;
  }

  const valueText = (feature.valueLabel || feature.value || '').trim();
  if (!valueText) {
    return featureLabel;
  }

  return `${featureLabel}: ${valueText}`;
}

function isDefinedFeature(feature: string | null): feature is string {
  return Boolean(feature);
}

function normalizeChangeMode(value: string | undefined) {
  if (value === 'immediate' || value === 'period_end') {
    return value;
  }

  return null;
}

function resolvePlanRelationLabel({
  relation,
  pricing
}: {
  relation: SubscriptionPlanRelation;
  pricing: Pick<
    MarketingPricingMessages,
    'currentPlanLabel' | 'upgradePlanLabel' | 'downgradePlanLabel' | 'lateralPlanLabel'
  >;
}) {
  if (relation === 'same_template') {
    return pricing.currentPlanLabel;
  }

  if (relation === 'upgrade') {
    return pricing.upgradePlanLabel;
  }

  if (relation === 'downgrade') {
    return pricing.downgradePlanLabel;
  }

  if (relation === 'lateral_change') {
    return pricing.lateralPlanLabel;
  }

  return null;
}

function sortTemplatesForDisplay(templates: PricingTemplate[]) {
  return [...templates].sort((left, right) => {
    const byRank = left.hierarchyRank - right.hierarchyRank;
    if (byRank !== 0) {
      return byRank;
    }

    const byPrice = left.priceCents - right.priceCents;
    if (byPrice !== 0) {
      return byPrice;
    }

    const byInterval =
      (BILLING_INTERVAL_DISPLAY_ORDER[left.billingInterval] ?? 999) -
      (BILLING_INTERVAL_DISPLAY_ORDER[right.billingInterval] ?? 999);
    if (byInterval !== 0) {
      return byInterval;
    }

    const byCategory = left.categoryKey.localeCompare(right.categoryKey);
    if (byCategory !== 0) {
      return byCategory;
    }

    return left.name.localeCompare(right.name);
  });
}

function getDisplayIntervalLabels(
  templates: PricingTemplate[],
  pricing: Pick<MarketingPricingMessages, 'intervals'>
) {
  return Array.from(
    new Set(
      templates.map(
        (template) =>
          pricing.intervals[template.billingInterval as keyof typeof pricing.intervals] ||
          template.billingInterval
      )
    )
  );
}

function getEnabledPaymentMethods({
  stripeEnabled,
  payPalEnabled,
  pricing
}: {
  stripeEnabled: boolean;
  payPalEnabled: boolean;
  pricing: Pick<
    MarketingPricingMessages,
    'paymentMethodStripe' | 'paymentMethodPayPal'
  >;
}) {
  const methods: string[] = [];

  if (stripeEnabled) {
    methods.push(pricing.paymentMethodStripe);
  }

  if (payPalEnabled) {
    methods.push(pricing.paymentMethodPayPal);
  }

  return methods;
}

function formatCountValue(value: number) {
  return String(value).padStart(2, '0');
}

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ changeMode?: string | string[] }>;
}) {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'global' })
  ]);
  const { headerPricing, pricing } = createMarketingPricingCopy(t);
  const dateLocale = getDateLocale(locale);
  const teamsEnabled = areTeamsEnabled();

  const [templates, paymentConfig, team, userAssignment] = await Promise.all([
    getPricingTemplates(),
    getPricingPaymentConfig(),
    teamsEnabled ? getTeamForUser() : Promise.resolve(null),
    teamsEnabled ? Promise.resolve(null) : getCurrentUserSubscriptionAssignment()
  ]);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const changeModeParam = Array.isArray(resolvedSearchParams?.changeMode)
    ? resolvedSearchParams.changeMode[0]
    : resolvedSearchParams?.changeMode;
  const requestedChangeMode = normalizeChangeMode(changeModeParam);
  const currentSubscriptionTemplateId = teamsEnabled
    ? team?.subscriptionTemplateId ?? null
    : userAssignment?.subscriptionTemplateId ?? null;
  const currentSubscriptionPeriodEnd = teamsEnabled
    ? team?.subscriptionCurrentPeriodEnd ?? null
    : userAssignment?.currentPeriodEnd ?? null;
  const currentSubscriptionTrialEndsAt = teamsEnabled
    ? team?.subscriptionTrialEndsAt ?? null
    : userAssignment?.trialEndsAt ?? null;
  const scheduledStartTime =
    requestedChangeMode === 'period_end'
      ? currentSubscriptionPeriodEnd?.toISOString() ??
        currentSubscriptionTrialEndsAt?.toISOString() ??
        null
      : null;
  const changeMode =
    requestedChangeMode === 'period_end' && !scheduledStartTime
      ? 'immediate'
      : requestedChangeMode;
  const selectedChangeMode = changeMode ?? 'immediate';
  const scheduledStartDate = scheduledStartTime
    ? new Date(scheduledStartTime)
    : null;
  const showChangeMode = Boolean(currentSubscriptionTemplateId);
  const themeSelection = await getThemeSelectionForArea('frontend');
  const selfServiceTemplates = filterSelfServiceSubscriptionTemplates(templates, {
    teamsEnabled
  });
  const organizationTemplates = selfServiceTemplates.filter(
    (template) => template.targetScope === 'organization'
  );
  const userTemplates = selfServiceTemplates.filter(
    (template) => template.targetScope === 'user'
  );
  const currentOrganizationTemplate =
    teamsEnabled && currentSubscriptionTemplateId
      ? templates.find(
          (template) =>
            template.id === currentSubscriptionTemplateId &&
            template.targetScope === 'organization'
        ) || null
      : null;
  const currentUserTemplate =
    !teamsEnabled && currentSubscriptionTemplateId
      ? templates.find(
          (template) =>
            template.id === currentSubscriptionTemplateId &&
            template.targetScope === 'user'
        ) || null
      : null;
  const hasAnyTemplate =
    organizationTemplates.length > 0 || userTemplates.length > 0;
  const pricingSummary = teamsEnabled
    ? pricing.organizationPlansDescription
    : pricing.userPlansDescription;
  const changeModeOptions = [
    {
      value: 'immediate' as const,
      label: pricing.changeModeImmediate,
      hint: pricing.changeModeImmediateHint,
      disabled: false
    },
    {
      value: 'period_end' as const,
      label: pricing.changeModePeriodEnd,
      hint: scheduledStartDate
        ? interpolate(pricing.changeModePeriodEndHint, {
            date: formatDateLabel(scheduledStartDate, dateLocale)
          })
        : pricing.changeModeUnavailable,
      disabled: !scheduledStartDate
    }
  ];
  const selectedChangeModeOption =
    changeModeOptions.find((option) => option.value === selectedChangeMode) ??
    changeModeOptions[0];
  const enabledPaymentMethods = getEnabledPaymentMethods({
    stripeEnabled: paymentConfig.stripeEnabled,
    payPalEnabled: paymentConfig.payPalEnabled,
    pricing
  });
  const overviewItems = [
    ...(teamsEnabled
      ? [
          {
            id: 'organization-plans',
            value: formatCountValue(organizationTemplates.length),
          }
        ]
      : [
          {
            id: 'user-plans',
            value: formatCountValue(userTemplates.length),
          }
        ]),
    {
      id: 'payment-methods',
      methods: enabledPaymentMethods
    },
    {
      id: 'change-mode',
      mode: selectedChangeMode,
      scheduledDateLabel: scheduledStartDate
        ? formatDateLabel(scheduledStartDate, dateLocale)
        : null,
      periodEndAvailable: Boolean(scheduledStartDate)
    }
  ];
  const sectionLinks = [
    ...(teamsEnabled && organizationTemplates.length > 0
      ? [{ href: '#organization-plans', id: 'organization-plans' }]
      : []),
    ...(!teamsEnabled && userTemplates.length > 0
      ? [{ href: '#user-plans', id: 'user-plans' }]
      : [])
  ];
  const pricingBody = (
    <div className="space-y-12">
      {!hasAnyTemplate ? (
        <p className="marketing-panel mx-auto max-w-2xl rounded-[1.75rem] p-6 text-center text-sm leading-relaxed text-zinc-400">
          {pricing.noPlansConfigured}
        </p>
      ) : null}

      {showChangeMode ? (
        <section className="marketing-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_34%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-amber-100/80">
                {pricing.changeModeLabel}
              </p>
              <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100 sm:text-4xl">
                {selectedChangeModeOption.label}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
                {selectedChangeModeOption.hint}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {changeModeOptions.map((option) => {
                const isActive = selectedChangeMode === option.value;
                const className = cn(
                  'rounded-[1.4rem] border px-5 py-4 text-left transition duration-300',
                  option.disabled
                    ? 'border-white/10 bg-white/5 text-zinc-500'
                    : isActive
                      ? 'border-amber-200/45 bg-amber-200/10 text-amber-50 shadow-[0_18px_45px_rgba(0,0,0,0.28)]'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-amber-200/30 hover:bg-white/8'
                );

                const content = (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs leading-relaxed text-zinc-400">{option.hint}</p>
                  </div>
                );

                return option.disabled ? (
                  <div key={option.value} className={className}>
                    {content}
                  </div>
                ) : (
                  <Link
                    key={option.value}
                    href={`/pricing?changeMode=${option.value}`}
                    className={className}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="space-y-16">
        {teamsEnabled ? (
          <PricingSection
            sectionId="organization-plans"
            title={pricing.organizationPlansTitle}
            description={pricing.organizationPlansDescription}
            emptyLabel={pricing.noOrganizationPlansConfigured}
            templates={organizationTemplates}
            pricing={pricing}
            enabledPaymentMethods={enabledPaymentMethods}
            dateLocale={dateLocale}
            changeMode={changeMode}
            currentTemplate={currentOrganizationTemplate}
            themeId={themeSelection?.themeKey ?? null}
          />
        ) : null}
        {!teamsEnabled ? (
          <PricingSection
            sectionId="user-plans"
            title={pricing.userPlansTitle}
            description={pricing.userPlansDescription}
            emptyLabel={pricing.noUserPlansConfigured}
            templates={userTemplates}
            pricing={pricing}
            enabledPaymentMethods={enabledPaymentMethods}
            dateLocale={dateLocale}
            changeMode={changeMode}
            currentTemplate={currentUserTemplate}
            themeId={themeSelection?.themeKey ?? null}
          />
        ) : null}
      </div>
    </div>
  );

  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="mb-10 space-y-4 animate-[marketing-rise_650ms_ease-out]">
        <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
          {headerPricing}
        </span>
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-tight text-zinc-100 sm:text-6xl">
          {pricing.headline}
        </h1>
        <p className="max-w-3xl text-base text-zinc-400">{pricingSummary}</p>
      </section>
      {pricingBody}
    </main>
  );

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeFrontendRoute
      path="/pricing"
      themeId={themeSelection.themeKey}
      data={{
        overviewItems,
        sectionLinks
      }}
      fallback={fallbackPage}
    >
      {pricingBody}
    </ThemeFrontendRoute>
  );
}

async function getPricingTemplates() {
  'use cache';
  cacheLife('hours');
  return getAllSubscriptionTemplatesForPricing();
}

async function getPricingPaymentConfig() {
  'use cache';
  cacheLife('hours');

  const [stripeEnabled, payPalEnabled] =
    await Promise.all([
      isStripeConfigured(),
      isPayPalConfigured()
    ]);

  return {
    stripeEnabled,
    payPalEnabled
  };
}

async function getCurrentUserSubscriptionAssignment() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  return getActiveUserSubscriptionAssignment(user.id);
}

function PricingSection({
  sectionId,
  title,
  description,
  emptyLabel,
  templates,
  pricing,
  enabledPaymentMethods,
  dateLocale,
  changeMode,
  currentTemplate,
  themeId
}: {
  sectionId: string;
  title: string;
  description: string;
  emptyLabel: string;
  templates: PricingTemplate[];
  pricing: MarketingPricingMessages;
  enabledPaymentMethods: string[];
  dateLocale: string;
  changeMode: 'immediate' | 'period_end' | null;
  currentTemplate: (SubscriptionPlanTemplateLike & { name: string }) | null;
  themeId: string | null;
}) {
  const displayTemplates = sortTemplatesForDisplay(templates);
  const intervalLabels = getDisplayIntervalLabels(displayTemplates, pricing);
  const hasCurrentTemplate =
    Boolean(currentTemplate) &&
    displayTemplates.some((template) => template.id === currentTemplate?.id);

  return (
    <section
      id={sectionId}
      className="scroll-mt-28 space-y-6 animate-[marketing-rise_750ms_ease-out]"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-2">
          <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100 sm:text-4xl">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasCurrentTemplate ? (
            <div className="marketing-panel rounded-full px-4 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {pricing.currentPlanLabel}
              </p>
              <p className="text-sm font-medium text-zinc-100">{currentTemplate?.name}</p>
            </div>
          ) : null}

          {intervalLabels.map((intervalLabel) => (
            <span
              key={intervalLabel}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-zinc-300 uppercase"
            >
              {intervalLabel}
            </span>
          ))}
        </div>
      </div>

      {displayTemplates.length === 0 ? (
        <p className="marketing-panel rounded-[1.5rem] p-5 text-sm leading-relaxed text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {displayTemplates.map((template) => {
            const planRelation = classifySubscriptionPlanRelation({
              currentTemplate,
              nextTemplate: template
            });
            const planRelationLabel = resolvePlanRelationLabel({
              relation: planRelation,
              pricing
            });
            const selfServiceEnabled = supportsSelfServiceSubscriptionTemplateScope(
              template.targetScope
            );

            return (
              <PricingCard
                key={template.id}
                name={template.name}
                priceLabel={formatMoney(template.priceCents, template.currency, dateLocale)}
                compareAtPriceLabel={
                  template.compareAtPriceCents
                    ? formatMoney(template.compareAtPriceCents, template.currency, dateLocale)
                    : null
                }
                discountPercent={getDiscountPercent(
                  template.priceCents,
                  template.compareAtPriceCents
                )}
                intervalLabel={
                  pricing.intervals[
                    template.billingInterval as keyof typeof pricing.intervals
                  ] || template.billingInterval
                }
                trialDays={template.trialPeriodDays}
                trialLabel={pricing.trialLabel}
                discountLabel={pricing.discountLabel}
                billingLabel={
                  template.targetScope === 'organization'
                    ? pricing.perOrganizationLabel
                    : pricing.perUserLabel
                }
                features={
                  template.features
                    .filter((feature) => feature.isPublic)
                    .map((feature) => formatPublicFeature(feature))
                    .filter(isDefinedFeature)
                }
                templateId={template.id}
                priceCents={template.priceCents}
                enabledPaymentMethods={enabledPaymentMethods}
                noPaymentConfiguredLabel={pricing.noPaymentConfigured}
                noFeaturesLabel={pricing.noFeatures}
                selfServiceUnavailableLabel={pricing.selfServiceUnavailableLabel}
                changeMode={changeMode}
                themeId={themeId}
                planRelation={planRelation}
                planRelationLabel={planRelationLabel}
                selfServiceEnabled={selfServiceEnabled}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PricingCard({
  name,
  priceLabel,
  compareAtPriceLabel,
  discountPercent,
  intervalLabel,
  trialDays,
  trialLabel,
  discountLabel,
  billingLabel,
  features,
  templateId,
  priceCents,
  enabledPaymentMethods,
  noPaymentConfiguredLabel,
  noFeaturesLabel,
  selfServiceUnavailableLabel,
  changeMode,
  themeId,
  planRelation,
  planRelationLabel,
  selfServiceEnabled
}: {
  name: string;
  priceLabel: string;
  compareAtPriceLabel: string | null;
  discountPercent: number | null;
  intervalLabel: string;
  trialDays: number;
  trialLabel: string;
  discountLabel: string;
  billingLabel: string;
  features: string[];
  templateId: number;
  priceCents: number;
  enabledPaymentMethods: string[];
  noPaymentConfiguredLabel: string;
  noFeaturesLabel: string;
  selfServiceUnavailableLabel: string;
  changeMode: 'immediate' | 'period_end' | null;
  themeId: string | null;
  planRelation: SubscriptionPlanRelation;
  planRelationLabel: string | null;
  selfServiceEnabled: boolean;
}) {
  const isZeroCost = priceCents === 0;
  const checkoutEnabled = isZeroCost || enabledPaymentMethods.length > 0;
  const isCurrentTemplate = planRelation === 'same_template';
  const featureItems = features.length > 0 ? features : [noFeaturesLabel];
  const hasPublicFeatures = features.length > 0;
  const checkoutDisabled =
    isCurrentTemplate || !checkoutEnabled || !selfServiceEnabled;
  const disabledLabel = isCurrentTemplate
    ? planRelationLabel
    : !selfServiceEnabled
      ? selfServiceUnavailableLabel
      : !checkoutEnabled
        ? noPaymentConfiguredLabel
        : null;
  const auxiliaryMessage = !selfServiceEnabled
    ? selfServiceUnavailableLabel
    : !checkoutEnabled
      ? noPaymentConfiguredLabel
      : null;
  const checkoutNode = checkoutEnabled ? (
    <form action={checkoutAction}>
      <input type="hidden" name="templateId" value={templateId} />
      {changeMode ? <input type="hidden" name="changeMode" value={changeMode} /> : null}
      <SubmitButton
        themeId={themeId}
        disabled={checkoutDisabled}
        disabledLabel={disabledLabel}
      />
    </form>
  ) : null;

  return (
    <div
      className={cn(
        'marketing-panel group relative flex h-full min-h-[34rem] flex-col overflow-hidden rounded-[2rem] p-6 transition duration-300',
        isCurrentTemplate
          ? 'border-amber-200/50 shadow-[0_26px_60px_rgba(0,0,0,0.55)]'
          : 'border-white/10 hover:-translate-y-1 hover:border-amber-200/28',
        !selfServiceEnabled && 'opacity-95'
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.14),transparent_36%)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex min-h-9 items-start justify-between gap-3">
          <div className="flex min-h-9 flex-wrap gap-2">
            {planRelationLabel ? (
              <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-amber-100 uppercase">
                {planRelationLabel}
              </span>
            ) : null}
            {discountPercent ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-emerald-300 uppercase">
                {interpolate(discountLabel, { percent: discountPercent })}
              </span>
            ) : null}
          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-zinc-300 uppercase">
            {intervalLabel}
          </span>
        </div>

        <div className="mt-6 flex min-h-[5.75rem] flex-col justify-start gap-3">
          <h3 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
            {name}
          </h3>
          <div className="min-h-[1.5rem]">
            {trialDays > 0 ? (
              <p className="text-sm leading-relaxed text-zinc-400">
                {interpolate(trialLabel, { days: trialDays })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex min-h-[6.75rem] flex-col justify-end gap-3 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-5xl font-semibold tracking-tight text-zinc-100">
              {priceLabel}
            </p>
            {compareAtPriceLabel ? (
              <p className="pb-1 text-sm text-zinc-500 line-through">
                {compareAtPriceLabel}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-zinc-400">
            {interpolate(billingLabel, { interval: intervalLabel })}
          </p>
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          <ul className="min-h-[8.75rem] space-y-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
            {featureItems.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
                <span
                  className={cn(
                    'text-sm leading-relaxed',
                    hasPublicFeatures ? 'text-zinc-300' : 'text-zinc-400'
                  )}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 min-h-[2rem]">
            {enabledPaymentMethods.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {enabledPaymentMethods.map((method) => (
                  <span
                    key={method}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-zinc-300 uppercase"
                  >
                    {method}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-auto pt-6 space-y-3">
            {checkoutNode}
            {!checkoutNode && !auxiliaryMessage ? (
              <p className="text-xs leading-relaxed text-zinc-500">
                {noPaymentConfiguredLabel}
              </p>
            ) : null}
            {auxiliaryMessage ? (
              <p className="text-xs leading-relaxed text-zinc-500">{auxiliaryMessage}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
