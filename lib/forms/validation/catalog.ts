import type { BuildFormValidationMessageCatalog } from '@skitsaas/sdk';
import { createCatalogBuildFormValidationMessageResolver } from '@skitsaas/sdk';
import type { AppLocale } from '@/lib/i18n/config';

export type LocalizedBuildFormValidationCatalog = Partial<
  Record<AppLocale, BuildFormValidationMessageCatalog>
>;

const CORE_BUILD_FORM_VALIDATION_CATALOG: Record<
  AppLocale,
  BuildFormValidationMessageCatalog
> = {
  en: {
    'build_form.validation.required': '{label} is required.',
    'build_form.validation.invalid_email': '{label} must be a valid email address.',
    'build_form.validation.min_length': '{label} must be at least {min} characters.',
    'build_form.validation.invalid_selection': 'Selected {label} is invalid.',
    'build_form.validation.record_not_found': '{label} was not found.',
    'build_form.validation.already_exists': '{label} already exists.',
    'build_form.validation.positive_integer': '{label} must be a positive integer.'
  },
  es: {
    'build_form.validation.required': '{label} es obligatorio.',
    'build_form.validation.invalid_email':
      '{label} debe ser un correo electronico valido.',
    'build_form.validation.min_length':
      '{label} debe tener al menos {min} caracteres.',
    'build_form.validation.invalid_selection': '{label} seleccionado no es valido.',
    'build_form.validation.record_not_found': 'No se encontro {label}.',
    'build_form.validation.already_exists': '{label} ya existe.',
    'build_form.validation.positive_integer':
      '{label} debe ser un entero positivo.'
  }
};

export function resolveBuildFormValidationCatalog(
  locale: AppLocale,
  extraCatalog: LocalizedBuildFormValidationCatalog = {}
) {
  return {
    ...(CORE_BUILD_FORM_VALIDATION_CATALOG.en ?? {}),
    ...(extraCatalog.en ?? {}),
    ...(locale === 'en' ? {} : CORE_BUILD_FORM_VALIDATION_CATALOG[locale] ?? {}),
    ...(locale === 'en' ? {} : extraCatalog[locale] ?? {})
  };
}

export function createCoreBuildFormValidationMessageResolver(
  locale: AppLocale,
  extraCatalog: LocalizedBuildFormValidationCatalog = {}
) {
  return createCatalogBuildFormValidationMessageResolver(
    resolveBuildFormValidationCatalog(locale, extraCatalog)
  );
}
