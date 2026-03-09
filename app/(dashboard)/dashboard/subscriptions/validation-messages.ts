import { createBuildFormValidationMessage } from '@skitsaas/sdk';
import type { AppLocale } from '@/lib/i18n/config';
import {
  createCoreBuildFormValidationMessageResolver,
  type LocalizedBuildFormValidationCatalog
} from '@/lib/forms/validation/catalog';

const DASHBOARD_SUBSCRIPTION_VALIDATION_CATALOG: LocalizedBuildFormValidationCatalog = {
  en: {
    'dashboard.subscriptions.validation.organization_unavailable':
      'Subscription management is not available for this organization.',
    'dashboard.subscriptions.validation.provider_unavailable':
      'Subscription management is temporarily unavailable.',
    'dashboard.subscriptions.validation.user_subscription_unavailable':
      'No active user subscription is available to cancel.'
  },
  es: {
    'dashboard.subscriptions.validation.organization_unavailable':
      'La gestion de suscripcion no esta disponible para esta organizacion.',
    'dashboard.subscriptions.validation.provider_unavailable':
      'La gestion de suscripcion no esta disponible temporalmente.',
    'dashboard.subscriptions.validation.user_subscription_unavailable':
      'No hay una suscripcion activa de usuario para cancelar.'
  }
};

export function createDashboardSubscriptionValidationMessageResolver(
  locale: AppLocale
) {
  return createCoreBuildFormValidationMessageResolver(
    locale,
    DASHBOARD_SUBSCRIPTION_VALIDATION_CATALOG
  );
}

export const dashboardSubscriptionValidationMessage = {
  organizationUnavailable() {
    return createBuildFormValidationMessage(
      'dashboard.subscriptions.validation.organization_unavailable',
      'Subscription management is not available for this organization.'
    );
  },
  providerUnavailable() {
    return createBuildFormValidationMessage(
      'dashboard.subscriptions.validation.provider_unavailable',
      'Subscription management is temporarily unavailable.'
    );
  },
  userSubscriptionUnavailable() {
    return createBuildFormValidationMessage(
      'dashboard.subscriptions.validation.user_subscription_unavailable',
      'No active user subscription is available to cancel.'
    );
  }
} as const;
