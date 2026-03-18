import { type ReactNode } from 'react';
import type { FlatTranslationsByLocale, FlatTranslationsByModuleId, Translator } from './types.js';
import type { ThemeTranslationsRegistry, UseI18nOptions } from './runtime.js';
export type { ThemeTranslationsByArea, ThemeTranslationsRegistry, UseI18nOptions } from './runtime.js';
export { resolveThemeTranslationsByLocale, resolveModuleTranslationsByLocale, resolveI18nTranslationsByLocale } from './runtime.js';
export declare function I18nProvider({ locale, defaultLocale, translationsByLocale, themeTranslationsByThemeId, moduleTranslationsByModuleId, children }: {
    locale: string;
    defaultLocale?: string;
    translationsByLocale?: FlatTranslationsByLocale;
    themeTranslationsByThemeId?: ThemeTranslationsRegistry;
    moduleTranslationsByModuleId?: FlatTranslationsByModuleId;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useI18n(options?: UseI18nOptions): Translator;
