'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react';
import { createTranslator } from './translator.js';
import type { FlatTranslationsByLocale, Translator } from './types.js';

export type ThemeTranslationsByArea = Record<string, FlatTranslationsByLocale>;
export type ThemeTranslationsRegistry = Record<string, ThemeTranslationsByArea>;

type I18nContextValue = {
  locale: string;
  defaultLocale: string;
  translationsByLocale: FlatTranslationsByLocale;
  themeTranslationsByThemeId: ThemeTranslationsRegistry;
};

export type UseI18nOptions = {
  themeId?: string | null;
  area?: string | null;
  translationsByLocale?: FlatTranslationsByLocale;
};

const EMPTY_TRANSLATIONS: FlatTranslationsByLocale = Object.freeze({});
const EMPTY_THEME_TRANSLATIONS: ThemeTranslationsRegistry = Object.freeze({});

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  defaultLocale: 'en',
  translationsByLocale: EMPTY_TRANSLATIONS,
  themeTranslationsByThemeId: EMPTY_THEME_TRANSLATIONS
});

function normalizeArea(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeThemeId(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function resolveThemeTranslationsByLocale({
  registry,
  themeId,
  area
}: {
  registry: ThemeTranslationsRegistry;
  themeId?: string | null;
  area?: string | null;
}): FlatTranslationsByLocale {
  const normalizedThemeId = normalizeThemeId(themeId);
  const normalizedArea = normalizeArea(area);

  if (!normalizedThemeId) {
    return EMPTY_TRANSLATIONS;
  }

  const themeTranslations = registry[normalizedThemeId];
  if (!themeTranslations) {
    return EMPTY_TRANSLATIONS;
  }

  const globalTranslations = themeTranslations.global ?? EMPTY_TRANSLATIONS;
  const areaTranslations = normalizedArea
    ? themeTranslations[normalizedArea] ?? EMPTY_TRANSLATIONS
    : EMPTY_TRANSLATIONS;
  const locales = Array.from(
    new Set([
      ...Object.keys(globalTranslations),
      ...Object.keys(areaTranslations)
    ])
  ).sort((left, right) => left.localeCompare(right));

  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        ...(globalTranslations[locale] ?? {}),
        ...(areaTranslations[locale] ?? {})
      }
    ])
  );
}

export function resolveI18nTranslationsByLocale({
  baseTranslationsByLocale,
  themeTranslationsByThemeId,
  themeId,
  area,
  translationsByLocale
}: {
  baseTranslationsByLocale: FlatTranslationsByLocale;
  themeTranslationsByThemeId: ThemeTranslationsRegistry;
  themeId?: string | null;
  area?: string | null;
  translationsByLocale?: FlatTranslationsByLocale;
}): FlatTranslationsByLocale {
  const overrideTranslations =
    translationsByLocale ??
    resolveThemeTranslationsByLocale({
      registry: themeTranslationsByThemeId,
      themeId,
      area
    });
  const locales = Array.from(
    new Set([
      ...Object.keys(baseTranslationsByLocale),
      ...Object.keys(overrideTranslations)
    ])
  ).sort((left, right) => left.localeCompare(right));

  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        ...(baseTranslationsByLocale[locale] ?? {}),
        ...(overrideTranslations[locale] ?? {})
      }
    ])
  );
}

export function I18nProvider({
  locale,
  defaultLocale = 'en',
  translationsByLocale = EMPTY_TRANSLATIONS,
  themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS,
  children
}: {
  locale: string;
  defaultLocale?: string;
  translationsByLocale?: FlatTranslationsByLocale;
  themeTranslationsByThemeId?: ThemeTranslationsRegistry;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      defaultLocale,
      translationsByLocale,
      themeTranslationsByThemeId
    }),
    [defaultLocale, locale, themeTranslationsByThemeId, translationsByLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(options: UseI18nOptions = {}): Translator {
  const {
    locale,
    defaultLocale,
    translationsByLocale: baseTranslationsByLocale,
    themeTranslationsByThemeId
  } = useContext(I18nContext);

  const translationsByLocale = useMemo(
    () =>
      resolveI18nTranslationsByLocale({
        baseTranslationsByLocale,
        themeTranslationsByThemeId,
        themeId: options.themeId,
        area: options.area,
        translationsByLocale: options.translationsByLocale
      }),
    [
      baseTranslationsByLocale,
      options.area,
      options.themeId,
      options.translationsByLocale,
      themeTranslationsByThemeId
    ]
  );

  return useMemo(
    () =>
      createTranslator(locale, {
        translationsByLocale,
        defaultLocale
      }),
    [defaultLocale, locale, translationsByLocale]
  );
}
