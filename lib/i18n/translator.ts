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
  const defaultTranslations =
    locale === DEFAULT_LOCALE ? {} : (translationsByLocale[DEFAULT_LOCALE] ?? {});

  return (key) => localeTranslations[key] ?? defaultTranslations[key] ?? key;
}
