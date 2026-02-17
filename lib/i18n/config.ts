export const SUPPORTED_LOCALES = ['en', 'es'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE_NAME = 'saas-starter-locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isAppLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function resolveLocale(value?: string | null): AppLocale {
  const normalized = value?.trim().toLowerCase();
  if (normalized && isAppLocale(normalized)) {
    return normalized;
  }

  return DEFAULT_LOCALE;
}
