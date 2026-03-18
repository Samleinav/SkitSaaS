'use client';

import {
  useI18n as useSdkI18n,
  type UseI18nOptions as SdkUseI18nOptions
} from '@skitsaas/sdk';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';
import { useLocale } from '@/components/i18n/language-provider';
import { type AreaMessagesMap, type I18nArea, getAreaMessages } from './messages';

export function useAreaMessages<TArea extends I18nArea>(
  area: TArea
): AreaMessagesMap[TArea] {
  const locale = useLocale();
  return getAreaMessages(area, locale);
}

export type HostUseI18nOptions = SdkUseI18nOptions;

export function useI18n(options: HostUseI18nOptions = {}) {
  const themeRuntime = useThemeRuntime();
  const resolvedThemeId =
    options.themeId ??
    (!themeRuntime
      ? undefined
      : !options.area || options.area === themeRuntime.area
        ? themeRuntime.themeKey ?? undefined
        : undefined);

  return useSdkI18n({
    ...options,
    themeId: resolvedThemeId
  });
}
