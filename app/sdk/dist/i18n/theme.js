'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
import { createTranslator } from './translator.js';
const EMPTY_TRANSLATIONS = Object.freeze({});
const EMPTY_THEME_TRANSLATIONS = Object.freeze({});
const I18nContext = createContext({
    locale: 'en',
    defaultLocale: 'en',
    translationsByLocale: EMPTY_TRANSLATIONS,
    themeTranslationsByThemeId: EMPTY_THEME_TRANSLATIONS
});
function normalizeArea(value) {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
}
function normalizeThemeId(value) {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
}
export function resolveThemeTranslationsByLocale({ registry, themeId, area }) {
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
    const locales = Array.from(new Set([
        ...Object.keys(globalTranslations),
        ...Object.keys(areaTranslations)
    ])).sort((left, right) => left.localeCompare(right));
    return Object.fromEntries(locales.map((locale) => [
        locale,
        {
            ...(globalTranslations[locale] ?? {}),
            ...(areaTranslations[locale] ?? {})
        }
    ]));
}
export function resolveI18nTranslationsByLocale({ baseTranslationsByLocale, themeTranslationsByThemeId, themeId, area, translationsByLocale }) {
    const overrideTranslations = translationsByLocale ??
        resolveThemeTranslationsByLocale({
            registry: themeTranslationsByThemeId,
            themeId,
            area
        });
    const locales = Array.from(new Set([
        ...Object.keys(baseTranslationsByLocale),
        ...Object.keys(overrideTranslations)
    ])).sort((left, right) => left.localeCompare(right));
    return Object.fromEntries(locales.map((locale) => [
        locale,
        {
            ...(baseTranslationsByLocale[locale] ?? {}),
            ...(overrideTranslations[locale] ?? {})
        }
    ]));
}
export function I18nProvider({ locale, defaultLocale = 'en', translationsByLocale = EMPTY_TRANSLATIONS, themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS, children }) {
    const value = useMemo(() => ({
        locale,
        defaultLocale,
        translationsByLocale,
        themeTranslationsByThemeId
    }), [defaultLocale, locale, themeTranslationsByThemeId, translationsByLocale]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useI18n(options = {}) {
    const { locale, defaultLocale, translationsByLocale: baseTranslationsByLocale, themeTranslationsByThemeId } = useContext(I18nContext);
    const translationsByLocale = useMemo(() => resolveI18nTranslationsByLocale({
        baseTranslationsByLocale,
        themeTranslationsByThemeId,
        themeId: options.themeId,
        area: options.area,
        translationsByLocale: options.translationsByLocale
    }), [
        baseTranslationsByLocale,
        options.area,
        options.themeId,
        options.translationsByLocale,
        themeTranslationsByThemeId
    ]);
    return useMemo(() => createTranslator(locale, {
        translationsByLocale,
        defaultLocale
    }), [defaultLocale, locale, translationsByLocale]);
}
