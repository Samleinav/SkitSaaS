'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode
} from 'react';
import { createTranslator } from './translator.js';
import type {
  FlatTranslationsByLocale,
  FlatTranslationsByModuleId,
  Translator
} from './types.js';
import {
  EMPTY_MODULE_TRANSLATIONS,
  EMPTY_THEME_TRANSLATIONS,
  EMPTY_TRANSLATIONS,
  resolveI18nTranslationsByLocale
} from './runtime.js';
import type {
  ThemeTranslationsRegistry,
  UseI18nOptions
} from './runtime.js';

type I18nContextValue = {
  locale: string;
  defaultLocale: string;
  translationsByLocale: FlatTranslationsByLocale;
  themeTranslationsByThemeId: ThemeTranslationsRegistry;
  moduleTranslationsByModuleId: FlatTranslationsByModuleId;
};

export type {
  ThemeTranslationsByArea,
  ThemeTranslationsRegistry,
  UseI18nOptions
} from './runtime.js';
export {
  resolveThemeTranslationsByLocale,
  resolveModuleTranslationsByLocale,
  resolveI18nTranslationsByLocale
} from './runtime.js';

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  defaultLocale: 'en',
  translationsByLocale: EMPTY_TRANSLATIONS,
  themeTranslationsByThemeId: EMPTY_THEME_TRANSLATIONS,
  moduleTranslationsByModuleId: EMPTY_MODULE_TRANSLATIONS
});

export function I18nProvider({
  locale,
  defaultLocale = 'en',
  translationsByLocale = EMPTY_TRANSLATIONS,
  themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS,
  moduleTranslationsByModuleId = EMPTY_MODULE_TRANSLATIONS,
  children
}: {
  locale: string;
  defaultLocale?: string;
  translationsByLocale?: FlatTranslationsByLocale;
  themeTranslationsByThemeId?: ThemeTranslationsRegistry;
  moduleTranslationsByModuleId?: FlatTranslationsByModuleId;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      defaultLocale,
      translationsByLocale,
      themeTranslationsByThemeId,
      moduleTranslationsByModuleId
    }),
    [
      defaultLocale,
      locale,
      moduleTranslationsByModuleId,
      themeTranslationsByThemeId,
      translationsByLocale
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(options: UseI18nOptions = {}): Translator {
  const {
    locale,
    defaultLocale,
    translationsByLocale: baseTranslationsByLocale,
    themeTranslationsByThemeId,
    moduleTranslationsByModuleId
  } = useContext(I18nContext);

  const translationsByLocale = useMemo(
    () =>
      resolveI18nTranslationsByLocale({
        baseTranslationsByLocale,
        moduleTranslationsByModuleId,
        themeTranslationsByThemeId,
        themeId: options.themeId,
        area: options.area,
        moduleId: options.moduleId,
        translationsByLocale: options.translationsByLocale
      }),
    [
      baseTranslationsByLocale,
      moduleTranslationsByModuleId,
      options.area,
      options.moduleId,
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
