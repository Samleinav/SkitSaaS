import { type ReactNode } from 'react';
import type { FlatTranslationsByLocale, Translator } from './types.js';
export type ThemeTranslationsByArea = Record<string, FlatTranslationsByLocale>;
export type ThemeTranslationsRegistry = Record<string, ThemeTranslationsByArea>;
export type UseI18nOptions = {
    themeId?: string | null;
    area?: string | null;
    translationsByLocale?: FlatTranslationsByLocale;
};
export declare function resolveThemeTranslationsByLocale({ registry, themeId, area }: {
    registry: ThemeTranslationsRegistry;
    themeId?: string | null;
    area?: string | null;
}): FlatTranslationsByLocale;
export declare function resolveI18nTranslationsByLocale({ baseTranslationsByLocale, themeTranslationsByThemeId, themeId, area, translationsByLocale }: {
    baseTranslationsByLocale: FlatTranslationsByLocale;
    themeTranslationsByThemeId: ThemeTranslationsRegistry;
    themeId?: string | null;
    area?: string | null;
    translationsByLocale?: FlatTranslationsByLocale;
}): FlatTranslationsByLocale;
export declare function I18nProvider({ locale, defaultLocale, translationsByLocale, themeTranslationsByThemeId, children }: {
    locale: string;
    defaultLocale?: string;
    translationsByLocale?: FlatTranslationsByLocale;
    themeTranslationsByThemeId?: ThemeTranslationsRegistry;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useI18n(options?: UseI18nOptions): Translator;
