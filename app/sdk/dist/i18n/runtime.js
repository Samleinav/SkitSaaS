export const EMPTY_TRANSLATIONS = Object.freeze({});
export const EMPTY_THEME_TRANSLATIONS = Object.freeze({});
export const EMPTY_MODULE_TRANSLATIONS = Object.freeze({});
function normalizeArea(value) {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
}
function normalizeThemeId(value) {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
}
function normalizeModuleId(value) {
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
export function resolveModuleTranslationsByLocale({ registry, moduleId }) {
    const normalizedModuleId = normalizeModuleId(moduleId);
    if (!normalizedModuleId) {
        return EMPTY_TRANSLATIONS;
    }
    return registry[normalizedModuleId] ?? EMPTY_TRANSLATIONS;
}
export function resolveI18nTranslationsByLocale({ baseTranslationsByLocale, themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS, moduleTranslationsByModuleId = EMPTY_MODULE_TRANSLATIONS, themeId, area, moduleId, translationsByLocale }) {
    const moduleTranslations = resolveModuleTranslationsByLocale({
        registry: moduleTranslationsByModuleId,
        moduleId
    });
    const themeTranslations = resolveThemeTranslationsByLocale({
        registry: themeTranslationsByThemeId,
        themeId,
        area
    });
    const explicitTranslations = translationsByLocale ?? EMPTY_TRANSLATIONS;
    const locales = Array.from(new Set([
        ...Object.keys(baseTranslationsByLocale),
        ...Object.keys(moduleTranslations),
        ...Object.keys(themeTranslations),
        ...Object.keys(explicitTranslations)
    ])).sort((left, right) => left.localeCompare(right));
    return Object.fromEntries(locales.map((locale) => [
        locale,
        {
            ...(baseTranslationsByLocale[locale] ?? {}),
            ...(moduleTranslations[locale] ?? {}),
            ...(themeTranslations[locale] ?? {}),
            ...(explicitTranslations[locale] ?? {})
        }
    ]));
}
