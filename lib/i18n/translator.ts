import {
  DEFAULT_LOCALE,
  type AppLocale
} from './config';
import { flatTranslationsByLocale } from './translations.generated';

export type Translator = (key: string) => string;

export function createTranslator(
  locale: AppLocale,
  translationsByLocale: Record<string, Record<string, string>> = flatTranslationsByLocale
): Translator {
  const localeTranslations = translationsByLocale[locale] ?? {};

  if (locale === DEFAULT_LOCALE) {
    return (key) => key;
  }

  return (key) => localeTranslations[key] ?? key;
}
