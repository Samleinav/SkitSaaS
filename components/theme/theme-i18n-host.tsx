'use client';

import { I18nProvider } from '@skitsaas/sdk';
import { flatTranslationsByLocale } from '@/lib/i18n/translations.generated';
import { THEME_TRANSLATIONS_BY_THEME_ID } from '@/lib/i18n/theme-translations.generated';
import type { ReactNode } from 'react';

/**
 * Host application wrapper for the SDK i18n provider.
 * Injects core flat translations plus theme overrides for theme components.
 */
export function ThemeI18nHost({
  locale,
  defaultLocale = 'en',
  children
}: {
  locale: string;
  defaultLocale?: string;
  children: ReactNode;
}) {
  return (
    <I18nProvider
      locale={locale}
      defaultLocale={defaultLocale}
      translationsByLocale={flatTranslationsByLocale}
      themeTranslationsByThemeId={THEME_TRANSLATIONS_BY_THEME_ID}
    >
      {children}
    </I18nProvider>
  );
}
