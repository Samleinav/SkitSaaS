'use client';

import {
  useI18n as useSdkI18n,
  type UseI18nOptions as SdkUseI18nOptions
} from '@skitsaas/sdk';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';
import {
  type AreaMessagesMap,
  type I18nArea,
  getAreaMessagesFromTranslator
} from './messages';

/**
 * @deprecated Prefer `useI18n({ area })` for new code. This helper remains only
 * as a typed compatibility layer for legacy host trees.
 */
export function useAreaMessages<TArea extends I18nArea>(
  area: TArea
): AreaMessagesMap[TArea] {
  const t = useI18n({ area });
  return getAreaMessagesFromTranslator(area, t);
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
