'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { createTranslator } from './translator.js';
import { EMPTY_MODULE_TRANSLATIONS, EMPTY_THEME_TRANSLATIONS, EMPTY_TRANSLATIONS, resolveI18nTranslationsByLocale } from './runtime.js';
export { resolveThemeTranslationsByLocale, resolveModuleTranslationsByLocale, resolveI18nTranslationsByLocale } from './runtime.js';
const I18nContext = createContext({
    locale: 'en',
    defaultLocale: 'en',
    translationsByLocale: EMPTY_TRANSLATIONS,
    themeTranslationsByThemeId: EMPTY_THEME_TRANSLATIONS,
    moduleTranslationsByModuleId: EMPTY_MODULE_TRANSLATIONS
});
export function I18nProvider({ locale, defaultLocale = 'en', translationsByLocale = EMPTY_TRANSLATIONS, themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS, moduleTranslationsByModuleId = EMPTY_MODULE_TRANSLATIONS, children }) {
    const value = useMemo(() => ({
        locale,
        defaultLocale,
        translationsByLocale,
        themeTranslationsByThemeId,
        moduleTranslationsByModuleId
    }), [
        defaultLocale,
        locale,
        moduleTranslationsByModuleId,
        themeTranslationsByThemeId,
        translationsByLocale
    ]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useI18n(options = {}) {
    const { locale, defaultLocale, translationsByLocale: baseTranslationsByLocale, themeTranslationsByThemeId, moduleTranslationsByModuleId } = useContext(I18nContext);
    const translationsByLocale = useMemo(() => resolveI18nTranslationsByLocale({
        baseTranslationsByLocale,
        moduleTranslationsByModuleId,
        themeTranslationsByThemeId,
        themeId: options.themeId,
        area: options.area,
        moduleId: options.moduleId,
        translationsByLocale: options.translationsByLocale
    }), [
        baseTranslationsByLocale,
        moduleTranslationsByModuleId,
        options.area,
        options.moduleId,
        options.themeId,
        options.translationsByLocale,
        themeTranslationsByThemeId
    ]);
    return useMemo(() => createTranslator(locale, {
        translationsByLocale,
        defaultLocale
    }), [defaultLocale, locale, translationsByLocale]);
}
