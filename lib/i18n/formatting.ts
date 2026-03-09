import type { AppLocale } from '@/lib/i18n/config';
import type { Translator } from './translator';

const DATE_LOCALE_FALLBACK = 'en-US';

const DATE_LOCALE_BY_APP_LOCALE: Partial<Record<AppLocale, string>> = {
  en: 'en-US',
  es: 'es-ES'
};

export function getDateLocale(locale: AppLocale | string) {
  const candidate = DATE_LOCALE_BY_APP_LOCALE[locale as AppLocale] ?? locale;

  try {
    return new Intl.Locale(candidate).toString();
  } catch {
    return DATE_LOCALE_FALLBACK;
  }
}

export function getLocaleDisplayName(
  locale: AppLocale | string,
  displayLocale: AppLocale | string = locale
) {
  try {
    const languageTag = new Intl.Locale(locale).language;
    const formatter = new Intl.DisplayNames([getDateLocale(displayLocale)], {
      type: 'language'
    });

    return formatter.of(languageTag) ?? languageTag.toUpperCase();
  } catch {
    return locale.toUpperCase();
  }
}

function interpolateTemplate(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

export function formatRelativeTimeLabel({
  date,
  locale,
  t,
  now = new Date()
}: {
  date: Date;
  locale: AppLocale | string;
  t: Translator;
  now?: Date;
}) {
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('just now');
  }

  if (diffInSeconds < 3600) {
    return interpolateTemplate(t('{count} minutes ago'), {
      count: Math.floor(diffInSeconds / 60)
    });
  }

  if (diffInSeconds < 86400) {
    return interpolateTemplate(t('{count} hours ago'), {
      count: Math.floor(diffInSeconds / 3600)
    });
  }

  if (diffInSeconds < 604800) {
    return interpolateTemplate(t('{count} days ago'), {
      count: Math.floor(diffInSeconds / 86400)
    });
  }

  return date.toLocaleDateString(getDateLocale(locale));
}
