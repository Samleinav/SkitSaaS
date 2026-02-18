'use client';

import type { ReactNode } from 'react';

type LayoutPrivateShellData = {
  area?: unknown;
  route?: unknown;
};

type LayoutPrivateShellTemplateProps = {
  data?: LayoutPrivateShellData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function LayoutPrivateShellTemplate({
  data,
  className,
  children
}: LayoutPrivateShellTemplateProps) {
  return (
    <section
      className={className || 'flex min-h-screen flex-col bg-transparent'}
      data-theme-template="layout.private.shell"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-route={toStringOrNull(data?.route) ?? undefined}
    >
      {children}
    </section>
  );
}
