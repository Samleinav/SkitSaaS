'use client';

import {
  Children,
  isValidElement,
  type ReactNode
} from 'react';
import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

type UserTableCellData = {
  slot?: string;
  status?: string;
};

function collectText(node: ReactNode, values: string[] = []): string[] {
  Children.forEach(node, (child) => {
    if (typeof child === 'string') {
      const trimmed = child.trim();
      if (trimmed) {
        values.push(trimmed);
      }
      return;
    }

    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return;
    }

    collectText(child.props.children, values);
  });

  return values;
}

function getInitials(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return 'U';
  }

  const parts = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return normalized.slice(0, 2).toUpperCase();
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export default function SectionAdminTableUsersCellTemplate({
  data,
  className,
  children
}: TemplateProps<UserTableCellData>) {
  const slot = toStringOrFallback(data?.slot, '');

  if (slot.startsWith('header.')) {
    return (
      <div
        className={mergeClassNames(
          '[&_[data-slot=button]]:-ml-1 [&_[data-slot=button]]:h-8 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:px-2.5 [&_[data-slot=button]]:text-[12px] [&_[data-slot=button]]:font-semibold [&_[data-slot=button]]:tracking-[-0.01em] [&_[data-slot=button]]:text-foreground [&_[data-slot=button]]:hover:bg-foreground/5',
          className
        )}
      >
        {children}
      </div>
    );
  }

  if (slot === 'cell.user') {
    const [name, email] = collectText(children);
    const resolvedName = name || 'Unnamed user';
    const resolvedEmail = email || '';

    return (
      <div className={mergeClassNames('flex min-w-[240px] items-center gap-3', className)}>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/55 bg-[linear-gradient(180deg,hsl(var(--muted)/0.28)_0%,hsl(var(--background))_100%)] text-[12px] font-semibold tracking-[-0.01em] text-foreground">
          {getInitials(resolvedName === 'Unnamed user' ? resolvedEmail : resolvedName)}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold tracking-[-0.015em] text-foreground">
            {resolvedName}
          </p>
          {resolvedEmail ? (
            <p className="truncate text-sm text-muted-foreground">{resolvedEmail}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (slot === 'cell.status') {
    const [label, reason] = collectText(children);
    const status = toStringOrFallback(data?.status, 'active');
    const statusToneClassName =
      status === 'suspended'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
        : status === 'banned' || status === 'deleted'
          ? 'border-rose-500/25 bg-rose-500/10 text-rose-200'
          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';

    return (
      <div className={mergeClassNames('space-y-1.5', className)}>
        <span
          className={mergeClassNames(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
            statusToneClassName
          )}
        >
          {label}
        </span>
        {reason ? (
          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
            {reason}
          </p>
        ) : null}
      </div>
    );
  }

  if (slot === 'cell.created-at') {
    return (
      <span
        className={mergeClassNames(
          'text-[13px] text-muted-foreground',
          className
        )}
      >
        {children}
      </span>
    );
  }

  if (slot === 'cell.actions.manage') {
    return (
      <div
        className={mergeClassNames(
          'flex justify-end [&_[data-slot=button]]:h-9 [&_[data-slot=button]]:rounded-lg [&_[data-slot=button]]:border-border/60 [&_[data-slot=button]]:bg-background/72 [&_[data-slot=button]]:px-3.5 [&_[data-slot=button]]:text-[13px] [&_[data-slot=button]]:font-medium [&_[data-slot=button]]:shadow-none',
          className
        )}
      >
        {children}
      </div>
    );
  }

  return <span className={className}>{children}</span>;
}
