'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/config';

const LanguageContext = createContext<AppLocale>(DEFAULT_LOCALE);

export function LanguageProvider({
  locale,
  children
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>
  );
}

export function useLocale() {
  return useContext(LanguageContext);
}
