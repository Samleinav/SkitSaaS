'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
// --- Helper Functions ---
/**
 * Resolves messages for a given theme and locale from the registry.
 * Falls back to defaultLocale if the specific locale is missing.
 */
export function resolveThemeMessages(registry, themeId, locale, defaultLocale = 'en') {
    if (!themeId)
        return {};
    const themeMessages = registry[themeId];
    if (!themeMessages)
        return {};
    return themeMessages[locale] ?? themeMessages[defaultLocale] ?? {};
}
const ThemeI18nContext = createContext({
    registry: {},
    locale: 'en',
    defaultLocale: 'en'
});
// --- Provider ---
/**
 * Provides the theme i18n registry and current locale to the component tree.
 * This should be rendered by the host application, passing in its generated registry.
 */
export function ThemeI18nProvider({ registry, locale, defaultLocale = 'en', children }) {
    return (_jsx(ThemeI18nContext.Provider, { value: { registry, locale, defaultLocale }, children: children }));
}
// --- Hook ---
/**
 * Hook to access translation messages for a specific theme.
 * Accesses the registry provided by ThemeI18nProvider.
 *
 * @param themeId - The ID of the theme (e.g., 'theme.pilot.admin').
 * @returns The message tree for the current locale.
 */
export function useThemeMessages(themeId) {
    const { registry, locale, defaultLocale } = useContext(ThemeI18nContext);
    return resolveThemeMessages(registry, themeId, locale, defaultLocale);
}
