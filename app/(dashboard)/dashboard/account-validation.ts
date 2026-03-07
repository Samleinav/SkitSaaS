import type { BuildFormValues } from '@skitsaas/sdk';
import { createBuildFormValidationMessage } from '@skitsaas/sdk';
import type { AppLocale } from '@/lib/i18n/config';
import { createCoreBuildFormValidationMessageResolver } from '@/lib/forms/validation/catalog';
import { createLocalizedBuildFormInvalidFactory } from '@/lib/forms/validation/server';

const DASHBOARD_ACCOUNT_VALIDATION_CATALOG: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {
    'dashboard.account.validation.request_invalid':
      'Unable to process this account request.',
    'dashboard.account.validation.current_password_invalid':
      'Current password is incorrect.',
    'dashboard.account.validation.new_password_same':
      'New password must be different from the current password.',
    'dashboard.account.validation.delete_password_invalid':
      'Incorrect password. Account deletion failed.'
  },
  es: {
    'dashboard.account.validation.request_invalid':
      'No se pudo procesar esta solicitud de cuenta.',
    'dashboard.account.validation.current_password_invalid':
      'La contrasena actual es incorrecta.',
    'dashboard.account.validation.new_password_same':
      'La nueva contrasena debe ser diferente a la contrasena actual.',
    'dashboard.account.validation.delete_password_invalid':
      'La contrasena es incorrecta. No se pudo eliminar la cuenta.'
  }
};

export function createDashboardAccountValidationMessageResolver(
  locale: AppLocale
) {
  return createCoreBuildFormValidationMessageResolver(
    locale,
    DASHBOARD_ACCOUNT_VALIDATION_CATALOG
  );
}

export const dashboardAccountValidationMessage = {
  requestInvalid() {
    return createBuildFormValidationMessage(
      'dashboard.account.validation.request_invalid',
      'Unable to process this account request.'
    );
  },
  currentPasswordInvalid() {
    return createBuildFormValidationMessage(
      'dashboard.account.validation.current_password_invalid',
      'Current password is incorrect.'
    );
  },
  newPasswordSame() {
    return createBuildFormValidationMessage(
      'dashboard.account.validation.new_password_same',
      'New password must be different from the current password.'
    );
  },
  deletePasswordInvalid() {
    return createBuildFormValidationMessage(
      'dashboard.account.validation.delete_password_invalid',
      'Incorrect password. Account deletion failed.'
    );
  }
} as const;

export async function createDashboardAccountInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>(values: TValues) {
  return createLocalizedBuildFormInvalidFactory({
    values,
    createResolver: createDashboardAccountValidationMessageResolver
  });
}
