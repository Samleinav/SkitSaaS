import type { FlatTranslationsByLocale, FlatTranslationsByModuleId, ModuleI18nNamespace } from './types.js';
export type ThemeTranslationsByArea = Record<string, FlatTranslationsByLocale>;
export type ThemeTranslationsRegistry = Record<string, ThemeTranslationsByArea>;
export type UseI18nOptions = {
    themeId?: string | null;
    area?: string | null;
    moduleId?: ModuleI18nNamespace | null;
    translationsByLocale?: FlatTranslationsByLocale;
};
export declare const EMPTY_TRANSLATIONS: FlatTranslationsByLocale;
export declare const EMPTY_THEME_TRANSLATIONS: ThemeTranslationsRegistry;
export declare const EMPTY_MODULE_TRANSLATIONS: FlatTranslationsByModuleId;
export declare function resolveThemeTranslationsByLocale({ registry, themeId, area }: {
    registry: ThemeTranslationsRegistry;
    themeId?: string | null;
    area?: string | null;
}): FlatTranslationsByLocale;
export declare function resolveModuleTranslationsByLocale({ registry, moduleId }: {
    registry: FlatTranslationsByModuleId;
    moduleId?: ModuleI18nNamespace | null;
}): FlatTranslationsByLocale;
export declare function resolveI18nTranslationsByLocale({ baseTranslationsByLocale, themeTranslationsByThemeId, moduleTranslationsByModuleId, themeId, area, moduleId, translationsByLocale }: {
    baseTranslationsByLocale: FlatTranslationsByLocale;
    themeTranslationsByThemeId?: ThemeTranslationsRegistry;
    moduleTranslationsByModuleId?: FlatTranslationsByModuleId;
    themeId?: string | null;
    area?: string | null;
    moduleId?: ModuleI18nNamespace | null;
    translationsByLocale?: FlatTranslationsByLocale;
}): FlatTranslationsByLocale;
