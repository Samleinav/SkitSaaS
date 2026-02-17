'use client';

import { ThemeI18nProvider } from '@skitsaas/sdk';
import { THEME_I18N_REGISTRY } from '@/lib/i18n/themes-i18n.generated';
import type { ReactNode } from 'react';

/**
 * Host application wrapper for the SDK's ThemeI18nProvider.
 * Injects the generated theme registry and current locale.
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
        <ThemeI18nProvider
            registry={THEME_I18N_REGISTRY}
            locale={locale}
            defaultLocale={defaultLocale}
        >
            {children}
        </ThemeI18nProvider>
    );
}
