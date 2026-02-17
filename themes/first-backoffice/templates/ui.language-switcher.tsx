'use client';

import type { ReactNode } from 'react';

type UiLanguageSwitcherData = {
  area?: unknown;
  slot?: unknown;
  variant?: unknown;
  mode?: unknown;
};

type UiLanguageSwitcherTemplateProps = {
  data?: UiLanguageSwitcherData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiLanguageSwitcherTemplate({
  data,
  className,
  children
}: UiLanguageSwitcherTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.language-switcher"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
      data-theme-variant={toStringOrNull(data?.variant) ?? undefined}
      data-theme-mode={toStringOrNull(data?.mode) ?? undefined}
    >
      {children}
    </div>
  );
}
