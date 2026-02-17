'use client';

import type { ReactNode } from 'react';

type UiAlertDialogData = {
  area?: unknown;
  slot?: unknown;
};

type UiAlertDialogTemplateProps = {
  data?: UiAlertDialogData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiAlertDialogTemplate({
  data,
  className,
  children
}: UiAlertDialogTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.alert-dialog"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
    >
      {children}
    </div>
  );
}
