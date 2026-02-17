'use client';

import type { ReactNode } from 'react';

type UiDialogData = {
  area?: unknown;
  slot?: unknown;
};

type UiDialogTemplateProps = {
  data?: UiDialogData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiDialogTemplate({
  data,
  className,
  children
}: UiDialogTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.dialog"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
    >
      {children}
    </div>
  );
}
