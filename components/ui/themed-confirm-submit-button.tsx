'use client';

import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';
import { ThemeTemplate } from '@/components/ui/theme-template';
import type { ComponentProps } from 'react';

type UiTemplateArea = 'admin' | 'dashboard' | 'frontend' | 'global';

export type ThemedConfirmSubmitButtonProps = ComponentProps<
  typeof ConfirmSubmitButton
> & {
  slot?: string;
  themeId?: string | null;
  area?: UiTemplateArea;
};

function normalizeThemeId(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeArea(value: string | null | undefined): UiTemplateArea | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'public') {
    return 'frontend';
  }

  if (
    normalized === 'admin' ||
    normalized === 'dashboard' ||
    normalized === 'frontend' ||
    normalized === 'global'
  ) {
    return normalized;
  }

  return null;
}

export function ThemedConfirmSubmitButton({
  slot,
  themeId,
  area,
  ...props
}: ThemedConfirmSubmitButtonProps) {
  const themeRuntime = useThemeRuntime();
  const resolvedThemeId = normalizeThemeId(themeId ?? themeRuntime?.themeKey);
  const resolvedArea = normalizeArea(area ?? themeRuntime?.area);

  const fallback = (
    <ConfirmSubmitButton
      templateComponentId="ui.alert-dialog"
      {...props}
    />
  );

  return (
    <ThemeTemplate
      id="ui.alert-dialog"
      themeId={resolvedThemeId}
      data={{
        area: resolvedArea,
        slot: typeof slot === 'string' ? slot : undefined
      }}
      fallback={fallback}
    >
      {fallback}
    </ThemeTemplate>
  );
}
