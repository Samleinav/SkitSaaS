import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

/**
 * NexusTablePagination - Modern pagination controls for tables
 */
type NexusTablePaginationProps = {
  className?: string;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  showPageInfo?: boolean;
  pageInfoText?: string;
  disabled?: boolean;
};

export function NexusTablePagination({
  className,
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  pageInfoText,
  disabled = false
}: NexusTablePaginationProps) {
  const canGoPrev = currentPage > 1 && !disabled;
  const canGoNext = currentPage < totalPages && !disabled;

  const handlePrev = () => {
    if (canGoPrev && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const buttonBaseStyles =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const buttonEnabledStyles =
    'bg-muted/50 text-foreground hover:bg-muted active:bg-muted/70';
  const buttonDisabledStyles = 'bg-muted/20 text-muted-foreground/30 cursor-not-allowed';

  return (
    <div
      className={mergeClassNames(
        'flex items-center justify-between gap-4 border-t border-border/70 bg-muted/20 px-4 py-3 @lg/table:px-5',
        className
      )}
      data-nexus-table-pagination
    >
      {showPageInfo && (
        <div className="text-sm text-muted-foreground">
          {pageInfoText || `Page ${currentPage} of ${totalPages}`}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={mergeClassNames(
            buttonBaseStyles,
            canGoPrev ? buttonEnabledStyles : buttonDisabledStyles
          )}
          aria-label="Previous page"
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className={mergeClassNames(
            buttonBaseStyles,
            canGoNext ? buttonEnabledStyles : buttonDisabledStyles
          )}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/**
 * NexusTableToolbar - Toolbar for search, filters, and actions above the table
 */
type NexusTableToolbarProps = {
  className?: string;
  searchSlot?: ReactNode;
  filterSlot?: ReactNode;
  actionSlot?: ReactNode;
  children?: ReactNode;
};

export function NexusTableToolbar({
  className,
  searchSlot,
  filterSlot,
  actionSlot,
  children
}: NexusTableToolbarProps) {
  return (
    <div
      className={mergeClassNames(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3 @lg/table:px-5',
        className
      )}
      data-nexus-table-toolbar
    >
      {children || (
        <>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {searchSlot}
            {filterSlot}
          </div>
          {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
        </>
      )}
    </div>
  );
}

/**
 * NexusTableEmpty - Empty state for tables with no data
 */
type NexusTableEmptyProps = {
  className?: string;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function NexusTableEmpty({
  className,
  icon,
  title = 'No data',
  description = 'No records found.',
  action
}: NexusTableEmptyProps) {
  return (
    <div
      className={mergeClassNames(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
      data-nexus-table-empty
    >
      {icon && (
        <div className="mb-3 text-muted-foreground/30" data-slot="icon">
          {icon}
        </div>
      )}

      <h4 className="mb-1 text-base font-semibold text-foreground">{title}</h4>

      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}

      {action && <div data-slot="action">{action}</div>}
    </div>
  );
}
