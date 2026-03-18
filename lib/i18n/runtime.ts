import {
  resolveI18nTranslationsByLocale,
  type UseI18nOptions
} from '@skitsaas/sdk';
import { flatTranslationsByModuleId } from './module-flat-translations.generated';
import { THEME_TRANSLATIONS_BY_THEME_ID } from './theme-translations.generated';
import { flatTranslationsByLocale } from './translations.generated';

export type HostUseI18nOptions = UseI18nOptions;

export function resolveHostI18nTranslationsByLocale(
  options: HostUseI18nOptions = {}
) {
  return resolveI18nTranslationsByLocale({
    baseTranslationsByLocale: flatTranslationsByLocale,
    moduleTranslationsByModuleId: flatTranslationsByModuleId,
    themeTranslationsByThemeId: THEME_TRANSLATIONS_BY_THEME_ID,
    ...options
  });
}
