import Link from 'next/link';
import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { isStripeConfigured } from '@/lib/payments/stripe';
import { isPayPalConfigured } from '@/lib/payments/paypal';
import { cacheLife } from 'next/cache';
import { SubmitButton } from './submit-button';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
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
import { supportsSelfServiceSubscriptionTemplateScope } from '@/lib/payments/subscription-scope';

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
  pricing: {
    currentPlanLabel: string;
    upgradePlanLabel: string;
    downgradePlanLabel: string;
    lateralPlanLabel: string;
  };
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

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ changeMode?: string | string[] }>;
}) {
  const { locale, messages } = await getServerLocaleAndMessages('global');
  const { header, pricing } = messages;
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const [templates, paymentConfig, team, user] = await Promise.all([
    getPricingTemplates(),
    getPricingPaymentConfig(),
    getTeamForUser(),
    getUser()
  ]);
  const activeUserAssignment = user
    ? await getActiveUserSubscriptionAssignment(user.id)
    : null;
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const changeModeParam = Array.isArray(resolvedSearchParams?.changeMode)
    ? resolvedSearchParams.changeMode[0]
    : resolvedSearchParams?.changeMode;
  const requestedChangeMode = normalizeChangeMode(changeModeParam);
  const scheduledStartTime =
    requestedChangeMode === 'period_end'
      ? team?.subscriptionCurrentPeriodEnd?.toISOString() ??
        team?.subscriptionTrialEndsAt?.toISOString() ??
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
  const showChangeMode = Boolean(team?.subscriptionTemplateId);
  const themeSelection = await getThemeSelectionForArea('frontend');
  const userTemplates = templates.filter((template) => template.targetScope === 'user');
  const organizationTemplates = templates.filter(
    (template) => template.targetScope === 'organization'
  );
  const currentOrganizationTemplate =
    team?.subscriptionTemplateId
      ? templates.find(
          (template) =>
            template.id === team.subscriptionTemplateId &&
            template.targetScope === 'organization'
        ) || null
      : null;
  const currentUserTemplate =
    activeUserAssignment?.subscriptionTemplateId
      ? templates.find(
          (template) =>
            template.id === activeUserAssignment.subscriptionTemplateId &&
            template.targetScope === 'user'
        ) || null
      : null;
  const hasAnyTemplate = userTemplates.length > 0 || organizationTemplates.length > 0;
  const pricingBody = (
    <>
      {!hasAnyTemplate ? (
        <p className="marketing-panel mx-auto max-w-2xl rounded-2xl p-6 text-center text-sm text-zinc-400">
          {pricing.noPlansConfigured}
        </p>
      ) : null}

      {showChangeMode ? (
        <section className="marketing-panel mb-10 rounded-2xl border border-white/5 bg-white/5 p-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              {pricing.changeModeLabel}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  {
                    value: 'immediate',
                    label: pricing.changeModeImmediate,
                    hint: pricing.changeModeImmediateHint,
                    disabled: false
                  },
                  {
                    value: 'period_end',
                    label: pricing.changeModePeriodEnd,
                    hint: scheduledStartDate
                      ? interpolate(pricing.changeModePeriodEndHint, {
                          date: formatDateLabel(scheduledStartDate, dateLocale)
                        })
                      : pricing.changeModeUnavailable,
                    disabled: !scheduledStartDate
                  }
                ] as const
              ).map((option) => {
                const isActive = selectedChangeMode === option.value;
                const className = cn(
                  'rounded-xl border px-4 py-3 text-left transition',
                  option.disabled
                    ? 'border-white/10 bg-white/5 text-zinc-500'
                    : isActive
                      ? 'border-amber-200/50 bg-amber-200/10 text-amber-100'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-amber-200/30'
                );

                const content = (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-zinc-400">{option.hint}</p>
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

      <div className="space-y-12">
        <PricingSection
          title={pricing.userPlansTitle}
          description={pricing.userPlansDescription}
          emptyLabel={pricing.noUserPlansConfigured}
          templates={userTemplates}
          pricing={pricing}
          dateLocale={dateLocale}
          stripeEnabled={paymentConfig.stripeEnabled}
          payPalEnabled={paymentConfig.payPalEnabled}
          changeMode={changeMode}
          currentTemplate={currentUserTemplate}
          themeId={themeSelection?.themeKey ?? null}
        />

        <PricingSection
          title={pricing.organizationPlansTitle}
          description={pricing.organizationPlansDescription}
          emptyLabel={pricing.noOrganizationPlansConfigured}
          templates={organizationTemplates}
          pricing={pricing}
          dateLocale={dateLocale}
          stripeEnabled={paymentConfig.stripeEnabled}
          payPalEnabled={paymentConfig.payPalEnabled}
          changeMode={changeMode}
          currentTemplate={currentOrganizationTemplate}
          themeId={themeSelection?.themeKey ?? null}
        />
      </div>
    </>
  );

  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="mb-10 space-y-4 animate-[marketing-rise_650ms_ease-out]">
        <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
          {header.pricing}
        </span>
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-tight text-zinc-100 sm:text-6xl">
          {pricing.headline}
        </h1>
        <p className="max-w-3xl text-base text-zinc-400">
          {pricing.userPlansDescription} {pricing.organizationPlansDescription}
        </p>
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
        badgeLabel: header.pricing,
        title: pricing.headline,
        subtitle: `${pricing.userPlansDescription} ${pricing.organizationPlansDescription}`
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

function PricingSection({
  title,
  description,
  emptyLabel,
  templates,
  pricing,
  dateLocale,
  stripeEnabled,
  payPalEnabled,
  changeMode,
  currentTemplate,
  themeId
}: {
  title: string;
  description: string;
  emptyLabel: string;
  templates: Array<{
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
    }>;
  }>;
  pricing: {
    trialLabel: string;
    perUserLabel: string;
    perOrganizationLabel: string;
    noPaymentConfigured: string;
    noFeatures: string;
    discountLabel: string;
    currentPlanLabel: string;
    upgradePlanLabel: string;
    downgradePlanLabel: string;
    lateralPlanLabel: string;
    selfServiceUnavailableLabel: string;
    intervals: Record<string, string>;
  };
  dateLocale: string;
  stripeEnabled: boolean;
  payPalEnabled: boolean;
  changeMode: 'immediate' | 'period_end' | null;
  currentTemplate: SubscriptionPlanTemplateLike | null;
  themeId: string | null;
}) {
  return (
    <section className="space-y-5 animate-[marketing-rise_750ms_ease-out]">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
          {title}
        </h2>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>

      {templates.length === 0 ? (
        <p className="marketing-panel rounded-xl p-4 text-sm text-zinc-400">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
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
                stripeEnabled={stripeEnabled}
                payPalEnabled={payPalEnabled}
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
  stripeEnabled,
  payPalEnabled,
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
  stripeEnabled: boolean;
  payPalEnabled: boolean;
  noPaymentConfiguredLabel: string;
  noFeaturesLabel: string;
  selfServiceUnavailableLabel: string;
  changeMode: 'immediate' | 'period_end' | null;
  themeId: string | null;
  planRelation: SubscriptionPlanRelation;
  planRelationLabel: string | null;
  selfServiceEnabled: boolean;
}) {
  const checkoutEnabled = stripeEnabled || payPalEnabled;
  const isCurrentTemplate = planRelation === 'same_template';
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
    <div className="marketing-panel flex h-full flex-col rounded-2xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {planRelationLabel ? (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-200">
              {planRelationLabel}
            </p>
          ) : null}
          <h3 className="font-[family-name:var(--font-marketing-serif)] text-3xl font-medium text-zinc-100">
            {name}
          </h3>
          {trialDays > 0 ? (
            <p className="mt-1 text-sm text-zinc-400">
              {interpolate(trialLabel, { days: trialDays })}
            </p>
          ) : null}
        </div>
        {discountPercent ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-300">
            {interpolate(discountLabel, { percent: discountPercent })}
          </span>
        ) : null}
      </div>

      <div className="mb-6">
        <p className="text-4xl font-semibold text-zinc-100">{priceLabel}</p>
        {compareAtPriceLabel ? (
          <p className="text-sm text-zinc-500 line-through">{compareAtPriceLabel}</p>
        ) : null}
        <p className="text-sm text-zinc-400">
          {interpolate(billingLabel, { interval: intervalLabel })}
        </p>
      </div>

      <ul className="mb-8 space-y-4">
        {(features.length > 0 ? features : [noFeaturesLabel]).map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
            <span className="text-sm text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3">
        {checkoutNode}
        {!checkoutNode && !auxiliaryMessage ? (
          <p className="text-xs text-zinc-500">{noPaymentConfiguredLabel}</p>
        ) : null}
        {auxiliaryMessage ? (
          <p className="text-xs text-zinc-500">{auxiliaryMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
