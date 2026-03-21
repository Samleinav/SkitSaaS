import type { Translator } from '@/lib/i18n/translator';

export type MarketingPricingMessages = {
  headline: string;
  trialLabel: string;
  perUserLabel: string;
  perOrganizationLabel: string;
  userPlansTitle: string;
  userPlansDescription: string;
  organizationPlansTitle: string;
  organizationPlansDescription: string;
  noUserPlansConfigured: string;
  noOrganizationPlansConfigured: string;
  noPaymentConfigured: string;
  noPlansConfigured: string;
  noFeatures: string;
  discountLabel: string;
  paymentMethodLabel: string;
  paymentMethodStripe: string;
  paymentMethodPayPal: string;
  changeModeLabel: string;
  changeModeImmediate: string;
  changeModePeriodEnd: string;
  changeModeImmediateHint: string;
  changeModePeriodEndHint: string;
  changeModeUnavailable: string;
  currentPlanLabel: string;
  upgradePlanLabel: string;
  downgradePlanLabel: string;
  lateralPlanLabel: string;
  selfServiceUnavailableLabel: string;
  intervals: Record<string, string>;
};

export type MarketingPricingCopy = {
  headerPricing: string;
  pricing: MarketingPricingMessages;
};

export function createMarketingPricingCopy(
  t: Translator
): MarketingPricingCopy {
  return {
    headerPricing: t('Pricing'),
    pricing: {
      headline: t('Clear subscriptions for individual work and team growth.'),
      trialLabel: t('{days} day free trial'),
      perUserLabel: t('per user / {interval}'),
      perOrganizationLabel: t('per organization / {interval}'),
      userPlansTitle: t('User plans'),
      userPlansDescription: t(
        'For individual work, personal spaces, and lighter operations with full plan visibility.'
      ),
      organizationPlansTitle: t('Organization plans'),
      organizationPlansDescription: t(
        'For teams that need collaboration, control, and a base built to scale.'
      ),
      noUserPlansConfigured: t('No user plans configured yet.'),
      noOrganizationPlansConfigured: t('No organization plans configured yet.'),
      noPaymentConfigured: t(
        'This plan does not have an available checkout yet.'
      ),
      noPlansConfigured: t(
        'No plans are published yet. Configure templates from Admin.'
      ),
      noFeatures: t('No public features are configured for this plan.'),
      discountLabel: t('Save {percent}%'),
      paymentMethodLabel: t('Payment method'),
      paymentMethodStripe: t('Stripe'),
      paymentMethodPayPal: t('PayPal'),
      changeModeLabel: t('Change timing'),
      changeModeImmediate: t('Apply now'),
      changeModePeriodEnd: t('At period end'),
      changeModeImmediateHint: t(
        'Activate the new plan as soon as checkout completes.'
      ),
      changeModePeriodEndHint: t(
        'Schedule the change so it starts on {date}.'
      ),
      changeModeUnavailable: t(
        'Period-end scheduling is not available yet.'
      ),
      currentPlanLabel: t('Current plan'),
      upgradePlanLabel: t('Upgrade'),
      downgradePlanLabel: t('Downgrade'),
      lateralPlanLabel: t('Switch plan'),
      selfServiceUnavailableLabel: t(
        'This plan scope requires assisted activation; self-service checkout is not available yet.'
      ),
      intervals: {
        daily: t('day'),
        weekly: t('week'),
        monthly: t('month'),
        quarterly: t('quarter'),
        semiannual: t('6 months'),
        yearly: t('year')
      }
    }
  };
}
