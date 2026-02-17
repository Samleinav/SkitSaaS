'use client';

import type { ReactNode } from 'react';

type UiUserMenuData = {
  area?: unknown;
  slot?: unknown;
  tone?: unknown;
};

type UiUserMenuTemplateProps = {
  data?: UiUserMenuData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiUserMenuTemplate({
  data,
  className,
  children
}: UiUserMenuTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.user-menu"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
      data-theme-tone={toStringOrNull(data?.tone) ?? undefined}
    >
      {children}
    </div>
  );
}
