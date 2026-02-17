'use client';

import { useLocale } from '@/components/i18n/language-provider';
import { type AreaMessagesMap, type I18nArea, getAreaMessages } from './messages';

export function useAreaMessages<TArea extends I18nArea>(
  area: TArea
): AreaMessagesMap[TArea] {
  const locale = useLocale();
  return getAreaMessages(area, locale);
}
