'use client';

import type { ReactNode } from 'react';

type UiThemeToggleData = {
  area?: unknown;
  slot?: unknown;
  variant?: unknown;
  mode?: unknown;
};

type UiThemeToggleTemplateProps = {
  data?: UiThemeToggleData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiThemeToggleTemplate({
  data,
  className,
  children
}: UiThemeToggleTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.theme-toggle"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
      data-theme-variant={toStringOrNull(data?.variant) ?? undefined}
      data-theme-mode={toStringOrNull(data?.mode) ?? undefined}
    >
      {children}
    </div>
  );
}
