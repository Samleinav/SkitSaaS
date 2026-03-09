import type { FlatTranslationsByLocale, Translator } from './types.js';

export type CreateTranslatorOptions = {
  translationsByLocale?: FlatTranslationsByLocale;
  defaultLocale?: string;
};

export function createTranslator(
  locale: string,
  options: CreateTranslatorOptions = {}
): Translator {
  const {
    translationsByLocale = Object.create(null) as FlatTranslationsByLocale,
    defaultLocale = 'en'
  } = options;
  const localeTranslations = translationsByLocale[locale] ?? {};

  if (locale === defaultLocale) {
    return (key) => key;
  }

  return (key) => localeTranslations[key] ?? key;
}
