import type {
  FlatTranslationsByLocale,
  FlatTranslationsByModuleId,
  ModuleI18nNamespace
} from './types.js';

export type ThemeTranslationsByArea = Record<string, FlatTranslationsByLocale>;
export type ThemeTranslationsRegistry = Record<string, ThemeTranslationsByArea>;

export type UseI18nOptions = {
  themeId?: string | null;
  area?: string | null;
  moduleId?: ModuleI18nNamespace | null;
  translationsByLocale?: FlatTranslationsByLocale;
};

export const EMPTY_TRANSLATIONS: FlatTranslationsByLocale = Object.freeze({});
export const EMPTY_THEME_TRANSLATIONS: ThemeTranslationsRegistry =
  Object.freeze({});
export const EMPTY_MODULE_TRANSLATIONS: FlatTranslationsByModuleId =
  Object.freeze({});

function normalizeArea(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeThemeId(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeModuleId(value: ModuleI18nNamespace | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? (normalized as ModuleI18nNamespace) : null;
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

export function resolveModuleTranslationsByLocale({
  registry,
  moduleId
}: {
  registry: FlatTranslationsByModuleId;
  moduleId?: ModuleI18nNamespace | null;
}): FlatTranslationsByLocale {
  const normalizedModuleId = normalizeModuleId(moduleId);

  if (!normalizedModuleId) {
    return EMPTY_TRANSLATIONS;
  }

  return registry[normalizedModuleId] ?? EMPTY_TRANSLATIONS;
}

export function resolveI18nTranslationsByLocale({
  baseTranslationsByLocale,
  themeTranslationsByThemeId = EMPTY_THEME_TRANSLATIONS,
  moduleTranslationsByModuleId = EMPTY_MODULE_TRANSLATIONS,
  themeId,
  area,
  moduleId,
  translationsByLocale
}: {
  baseTranslationsByLocale: FlatTranslationsByLocale;
  themeTranslationsByThemeId?: ThemeTranslationsRegistry;
  moduleTranslationsByModuleId?: FlatTranslationsByModuleId;
  themeId?: string | null;
  area?: string | null;
  moduleId?: ModuleI18nNamespace | null;
  translationsByLocale?: FlatTranslationsByLocale;
}): FlatTranslationsByLocale {
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
  const locales = Array.from(
    new Set([
      ...Object.keys(baseTranslationsByLocale),
      ...Object.keys(moduleTranslations),
      ...Object.keys(themeTranslations),
      ...Object.keys(explicitTranslations)
    ])
  ).sort((left, right) => left.localeCompare(right));

  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        ...(baseTranslationsByLocale[locale] ?? {}),
        ...(moduleTranslations[locale] ?? {}),
        ...(themeTranslations[locale] ?? {}),
        ...(explicitTranslations[locale] ?? {})
      }
    ])
  );
}
