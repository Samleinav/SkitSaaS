'use client';

import type { ReactNode } from 'react';

type UiTableControlData = {
  area?: unknown;
  slot?: unknown;
  componentId?: unknown;
  templateId?: unknown;
  templateSource?: unknown;
};

type UiTableControlTemplateProps = {
  data?: UiTableControlData;
  className?: string;
  children?: ReactNode;
};

function toStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeArea(value: unknown) {
  const area = toStringOrNull(value);
  if (area === 'dashboard' || area === 'admin') {
    return area;
  }

  return 'admin';
}

function normalizeSlotClassName(slot: string | null) {
  if (!slot) {
    return null;
  }

  return `theme-first-backoffice-table-control-${slot.replace(/[^a-z0-9.-]/gi, '-').replace(/\./g, '-')}`;
}

function mergeClassNames(
  ...values: Array<string | null | undefined | false>
) {
  return values.filter(Boolean).join(' ');
}

export default function UiTableControlTemplate({
  data,
  className,
  children
}: UiTableControlTemplateProps) {
  const area = normalizeArea(data?.area);
  const slot = toStringOrNull(data?.slot);

  return (
    <div
      className={mergeClassNames(
        'contents theme-first-backoffice-table-control',
        `theme-first-backoffice-table-control-area-${area}`,
        normalizeSlotClassName(slot),
        className
      )}
      data-theme-template="ui.table.control"
      data-theme-table-area={area}
      data-theme-slot={slot ?? undefined}
      data-theme-component-id={toStringOrNull(data?.componentId) ?? undefined}
      data-template-id={toStringOrNull(data?.templateId) ?? undefined}
      data-template-source={toStringOrNull(data?.templateSource) ?? undefined}
    >
      {children}
    </div>
  );
}
