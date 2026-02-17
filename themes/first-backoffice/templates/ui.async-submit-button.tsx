'use client';

import type { ReactNode } from 'react';

type UiAsyncSubmitButtonData = {
  area?: unknown;
  slot?: unknown;
};

type UiAsyncSubmitButtonTemplateProps = {
  data?: UiAsyncSubmitButtonData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export default function UiAsyncSubmitButtonTemplate({
  data,
  className,
  children
}: UiAsyncSubmitButtonTemplateProps) {
  return (
    <div
      className={className}
      data-theme-template="ui.async-submit-button"
      data-theme-area={toStringOrNull(data?.area) ?? undefined}
      data-theme-slot={toStringOrNull(data?.slot) ?? undefined}
    >
      {children}
    </div>
  );
}
