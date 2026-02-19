'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ThemeTemplate } from '@/components/ui/theme-template';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';
import { cn } from '@/lib/utils';

export type DataTableLabels = {
  filterPlaceholder: string;
  columns: string;
  noResults: string;
  showingRows: string;
  previous: string;
  next: string;
};

export type DataTableThemeTemplate = {
  componentId?: string | null;
  controlComponentId?: string | null;
  templateId?: string | null;
  templateSource?: string | null;
  themeId?: string | null;
  area?: string | null;
  payload?: {
    containerClassName?: string;
    tableClassName?: string;
  } | null;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  labels?: Partial<DataTableLabels>;
  template?: DataTableThemeTemplate;
  filterColumn?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  frameClassName?: string;
  tableClassName?: string;
  toolbarActions?: React.ReactNode;
  initialColumnVisibility?: VisibilityState;
}

const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = {
  filterPlaceholder: 'Filter...',
  columns: 'Columns',
  noResults: 'No results.',
  showingRows: 'Showing {shown} of {filtered} rows',
  previous: 'Previous',
  next: 'Next'
};

export function DataTable<TData, TValue>({
  columns,
  data,
  labels,
  template,
  filterColumn,
  filterPlaceholder,
  emptyMessage,
  frameClassName,
  tableClassName,
  toolbarActions,
  initialColumnVisibility
}: DataTableProps<TData, TValue>) {
  const dataTable = {
    ...DEFAULT_DATA_TABLE_LABELS,
    ...(labels ?? {})
  };
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    () => initialColumnVisibility ?? {}
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility
    }
  });

  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());
  const filterableColumn = filterColumn ? table.getColumn(filterColumn) : undefined;
  const hasToolbarControls = Boolean(toolbarActions) || hideableColumns.length > 0;
  const shownRows = table.getRowModel().rows.length;
  const filteredRows = table.getFilteredRowModel().rows.length;
  const themeRuntime = useThemeRuntime();
  const resolvedThemeId = template?.themeId ?? themeRuntime?.themeKey ?? null;
  const resolvedTemplateArea = template?.area ?? themeRuntime?.area ?? null;
  const resolvedTemplateComponentId = (
    template?.componentId ?? 'ui.table'
  ).toLowerCase();
  const hasThemeCodeTemplate =
    typeof resolvedThemeId === 'string' && resolvedThemeId.trim().length > 0;
  const resolvedTemplateId =
    template?.templateId ??
    (hasThemeCodeTemplate ? resolvedTemplateComponentId : null);
  const resolvedTemplateSource =
    template?.templateSource ?? (hasThemeCodeTemplate ? 'theme_code' : null);
  const resolvedControlTemplateId = (
    template?.controlComponentId ?? `${resolvedTemplateComponentId}.control`
  ).toLowerCase();
  const renderControlSlot = ({
    slot,
    fallback,
    data
  }: {
    slot: string;
    fallback: React.ReactNode;
    data?: Record<string, unknown>;
  }) => {
    if (!hasThemeCodeTemplate) {
      return fallback;
    }

    return (
      <ThemeTemplate
        id={resolvedControlTemplateId}
        themeId={resolvedThemeId}
        data={{
          area: resolvedTemplateArea,
          slot,
          componentId: resolvedTemplateComponentId,
          templateId: resolvedTemplateId,
          templateSource: resolvedTemplateSource,
          ...(data ?? {})
        }}
        fallback={fallback}
      >
        {fallback}
      </ThemeTemplate>
    );
  };
  const filterInputFallback = filterableColumn ? (
    <Input
      placeholder={filterPlaceholder || dataTable.filterPlaceholder}
      value={(filterableColumn.getFilterValue() as string) ?? ''}
      onChange={(event) =>
        filterableColumn.setFilterValue(event.target.value)
      }
      className="sm:max-w-sm"
    />
  ) : null;
  const filterInput = filterInputFallback
    ? renderControlSlot({
        slot: 'toolbar.filter',
        fallback: filterInputFallback
      })
    : null;
  const columnsToggleFallback =
    hideableColumns.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {renderControlSlot({
              slot: 'toolbar.columns-toggle.label',
              fallback: <span>{dataTable.columns}</span>
            })}
            {renderControlSlot({
              slot: 'toolbar.columns-toggle.icon',
              fallback: <ChevronDown className="h-4 w-4" />
            })}
          </Button>
        </DropdownMenuTrigger>
        {renderControlSlot({
          slot: 'toolbar.columns-toggle.menu-content',
          fallback: (
            <DropdownMenuContent align="end">
              {hideableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(Boolean(value))
                  }
                >
                  {renderControlSlot({
                    slot: 'toolbar.columns-toggle.menu-item-label',
                    fallback: <span>{column.id}</span>,
                    data: {
                      columnId: column.id,
                      visible: column.getIsVisible()
                    }
                  })}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          ),
          data: {
            hideableColumnsCount: hideableColumns.length
          }
        })}
      </DropdownMenu>
    ) : null;
  const columnsToggle = columnsToggleFallback
    ? renderControlSlot({
        slot: 'toolbar.columns-toggle',
        fallback: columnsToggleFallback,
        data: {
          hideableColumnsCount: hideableColumns.length
        }
      })
    : null;
  const toolbarActionsFallback = hasToolbarControls ? (
    <div className="flex items-center gap-2 sm:ml-auto">
      {toolbarActions}
      {columnsToggle}
    </div>
  ) : null;
  const toolbarActionsSlot = toolbarActionsFallback
    ? renderControlSlot({
        slot: 'toolbar.actions',
        fallback: toolbarActionsFallback,
        data: {
          hasCustomActions: Boolean(toolbarActions),
          hasColumnToggle: hideableColumns.length > 0
        }
      })
    : null;
  const toolbarFallback =
    filterInput || toolbarActionsSlot ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {filterInput}
        {toolbarActionsSlot}
      </div>
    ) : null;
  const toolbar = toolbarFallback
    ? renderControlSlot({
        slot: 'toolbar',
        fallback: toolbarFallback
      })
    : null;
  const emptyStateFallback = <span>{emptyMessage || dataTable.noResults}</span>;
  const emptyState = renderControlSlot({
    slot: 'body.empty',
    fallback: emptyStateFallback
  });
  const tableMarkup = (
    <Table
      className={cn(template?.payload?.tableClassName, tableClassName)}
      containerClassName={template?.payload?.containerClassName}
      templateComponentId={resolvedTemplateComponentId}
      templateId={resolvedTemplateId}
      templateSource={resolvedTemplateSource}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getVisibleLeafColumns().length}
              className="h-24 text-center"
            >
              {emptyState}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
  const fallbackTableSurface = (
    <div className={cn('overflow-hidden rounded-md border', frameClassName)}>
      {tableMarkup}
    </div>
  );
  const tableSurface = hasThemeCodeTemplate ? (
    <ThemeTemplate
      id={resolvedTemplateComponentId}
      themeId={resolvedThemeId}
      data={{
        area: resolvedTemplateArea,
        templateId: resolvedTemplateId,
        templateSource: resolvedTemplateSource,
        frameClassName,
        tableClassName,
        containerClassName: template?.payload?.containerClassName
      }}
      fallback={fallbackTableSurface}
    >
      {tableMarkup}
    </ThemeTemplate>
  ) : (
    fallbackTableSurface
  );
  const paginationSummaryFallback = (
    <p className="text-muted-foreground text-xs sm:text-sm">
      {dataTable.showingRows
        .replace('{shown}', String(shownRows))
        .replace('{filtered}', String(filteredRows))}
    </p>
  );
  const paginationSummary = renderControlSlot({
    slot: 'pagination.summary',
    fallback: paginationSummaryFallback,
    data: {
      shownRows,
      filteredRows
    }
  });
  const previousButtonFallback = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => table.previousPage()}
      disabled={!table.getCanPreviousPage()}
    >
      {dataTable.previous}
    </Button>
  );
  const previousButton = renderControlSlot({
    slot: 'pagination.previous',
    fallback: previousButtonFallback,
    data: {
      disabled: !table.getCanPreviousPage()
    }
  });
  const nextButtonFallback = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => table.nextPage()}
      disabled={!table.getCanNextPage()}
    >
      {dataTable.next}
    </Button>
  );
  const nextButton = renderControlSlot({
    slot: 'pagination.next',
    fallback: nextButtonFallback,
    data: {
      disabled: !table.getCanNextPage()
    }
  });
  const paginationActionsFallback = (
    <div className="ml-auto flex items-center gap-2">
      {previousButton}
      {nextButton}
    </div>
  );
  const paginationActions = renderControlSlot({
    slot: 'pagination.actions',
    fallback: paginationActionsFallback
  });
  const paginationFallback = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {paginationSummary}
      {paginationActions}
    </div>
  );
  const pagination = renderControlSlot({
    slot: 'pagination',
    fallback: paginationFallback
  });

  return (
    <div className="space-y-4">
      {toolbar}
      {tableSurface}
      {pagination}
    </div>
  );
}
