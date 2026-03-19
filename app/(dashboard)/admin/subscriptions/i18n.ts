import type { Translator } from '@/lib/i18n/translator';
import type { SubscriptionTemplateFormCopy } from './forms';

export function getAdminSubscriptionScopeLabels(t: Translator) {
  return {
    user: t('User'),
    organization: t('Organization')
  } as const;
}

export function getAdminSubscriptionIntervalLabels(t: Translator) {
  return {
    daily: t('Daily'),
    weekly: t('Weekly'),
    monthly: t('Monthly'),
    quarterly: t('Quarterly'),
    semiannual: t('Semi-annual'),
    yearly: t('Yearly')
  } as const;
}

function getAdminSubscriptionValueTypeLabels(t: Translator) {
  return {
    text: t('Text'),
    number: t('Number'),
    boolean: t('Boolean'),
    null: t('No value')
  } as const;
}

export function createAdminSubscriptionTemplateFormCopy(
  t: Translator
): SubscriptionTemplateFormCopy {
  return {
    planSectionTitle: t('Plan settings'),
    templateNameLabel: t('Template name'),
    templateNamePlaceholder: t('Template name'),
    targetScopeLabel: t('Subscription scope'),
    categoryKeyLabel: t('Category key'),
    categoryKeyPlaceholder: t('Category key (e.g. team.pro)'),
    hierarchyRankLabel: t('Hierarchy rank'),
    hierarchyRankPlaceholder: t('Hierarchy rank (higher means bigger plan)'),
    scopeLabels: getAdminSubscriptionScopeLabels(t),
    billingIntervalLabel: t('Billing interval'),
    intervalLabels: getAdminSubscriptionIntervalLabels(t),
    priceLabel: t('Price'),
    pricePlaceholder: t('Price (e.g. 19.99)'),
    compareAtPriceLabel: t('Compare at price'),
    compareAtPricePlaceholder: t('Compare at price (optional)'),
    currencyLabel: t('Currency'),
    currencyPlaceholder: t('Currency (USD)'),
    trialDaysLabel: t('Trial days'),
    trialDaysPlaceholder: t('Trial days'),
    featuresSectionTitle: t('Template features'),
    featuresSectionHint: t(
      'Only rows marked as public are shown on the pricing page.'
    ),
    featureKeyLabel: t('Key'),
    featureLabelLabel: t('Label'),
    featureTypeLabel: t('Value type'),
    featureValueLabel: t('Value'),
    featureValueLabelLabel: t('Public value label'),
    featurePublicLabel: t('Public'),
    featureKeyPlaceholder: t('feature key'),
    featureLabelPlaceholder: t('Feature label'),
    featureValuePlaceholder: t('feature value'),
    featureValueLabelPlaceholder: t('Shown value label'),
    addFeature: t('Add feature'),
    removeFeature: t('Remove'),
    valueTypeLabels: getAdminSubscriptionValueTypeLabels(t)
  };
}
