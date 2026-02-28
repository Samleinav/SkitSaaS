import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

/**
 * NexusTable - Modern table container with container queries and responsive design
 */
type NexusTableProps = {
  className?: string;
  variant?: 'default' | 'compact' | 'bordered';
  children?: ReactNode;
};

export function NexusTable({ className, variant = 'default', children }: NexusTableProps) {
  const variantStyles = {
    default: 'border border-border/70 shadow-sm',
    compact: 'border border-border/50',
    bordered: 'border-2 border-border shadow-md'
  };

  return (
    <div
      className={mergeClassNames(
        '@container/table overflow-hidden rounded-2xl bg-card',
        variantStyles[variant],
        className
      )}
      data-nexus-table={variant}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    </div>
  );
}

/**
 * NexusTableHeader - Table header with enhanced styling
 */
type NexusTableHeaderProps = {
  className?: string;
  children?: ReactNode;
};

export function NexusTableHeader({ className, children }: NexusTableHeaderProps) {
  return (
    <thead
      className={mergeClassNames(
        'border-b border-border/70 bg-muted/30',
        className
      )}
      data-slot="table-header"
    >
      {children}
    </thead>
  );
}

/**
 * NexusTableBody - Table body container
 */
type NexusTableBodyProps = {
  className?: string;
  children?: ReactNode;
};

export function NexusTableBody({ className, children }: NexusTableBodyProps) {
  return (
    <tbody className={className} data-slot="table-body">
      {children}
    </tbody>
  );
}

/**
 * NexusTableRow - Table row with hover and active states
 */
type NexusTableRowProps = {
  className?: string;
  clickable?: boolean;
  selected?: boolean;
  children?: ReactNode;
};

export function NexusTableRow({
  className,
  clickable = false,
  selected = false,
  children
}: NexusTableRowProps) {
  const baseStyles = 'border-b border-border/40 last:border-0 transition-colors';
  const interactiveStyles = clickable
    ? 'hover:bg-muted/40 cursor-pointer active:bg-muted/60'
    : '';
  const selectedStyles = selected ? 'bg-primary/5' : '';

  return (
    <tr
      className={mergeClassNames(baseStyles, interactiveStyles, selectedStyles, className)}
      data-slot="table-row"
      data-clickable={clickable || undefined}
      data-selected={selected || undefined}
    >
      {children}
    </tr>
  );
}

/**
 * NexusTableHead - Table header cell with sorting support
 */
type NexusTableHeadProps = {
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  align?: 'left' | 'center' | 'right';
  children?: ReactNode;
};

export function NexusTableHead({
  className,
  sortable = false,
  sorted = false,
  align = 'left',
  children
}: NexusTableHeadProps) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const sortableStyles = sortable
    ? 'cursor-pointer select-none hover:bg-muted/50 active:bg-muted/70'
    : '';

  return (
    <th
      className={mergeClassNames(
        'px-4 py-3 font-semibold text-muted-foreground @lg/table:px-5',
        alignStyles[align],
        sortableStyles,
        className
      )}
      data-slot="table-head"
      data-sortable={sortable || undefined}
      data-sorted={sorted || undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-muted-foreground/50 text-xs">
            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

/**
 * NexusTableCell - Table data cell with responsive padding
 */
type NexusTableCellProps = {
  className?: string;
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
  children?: ReactNode;
};

export function NexusTableCell({
  className,
  align = 'left',
  truncate = false,
  children
}: NexusTableCellProps) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const truncateStyles = truncate ? 'truncate max-w-xs' : '';

  return (
    <td
      className={mergeClassNames(
        'px-4 py-3 @lg/table:px-5 @lg/table:py-4',
        alignStyles[align],
        truncateStyles,
        className
      )}
      data-slot="table-cell"
    >
      {children}
    </td>
  );
}

/**
 * NexusTableFooter - Table footer for pagination or summary
 */
type NexusTableFooterProps = {
  className?: string;
  children?: ReactNode;
};

export function NexusTableFooter({ className, children }: NexusTableFooterProps) {
  return (
    <tfoot
      className={mergeClassNames(
        'border-t border-border/70 bg-muted/20',
        className
      )}
      data-slot="table-footer"
    >
      {children}
    </tfoot>
  );
}

/**
 * NexusTableCaption - Table caption for accessibility
 */
type NexusTableCaptionProps = {
  className?: string;
  children?: ReactNode;
};

export function NexusTableCaption({ className, children }: NexusTableCaptionProps) {
  return (
    <caption
      className={mergeClassNames(
        'px-4 py-3 text-left text-sm text-muted-foreground',
        className
      )}
      data-slot="table-caption"
    >
      {children}
    </caption>
  );
}
