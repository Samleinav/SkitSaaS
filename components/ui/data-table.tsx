'use client';

import * as React from 'react';
import {
  type BuildTableActionDefinition,
  type BuildTableButtonActionDefinition,
  type BuildTableConfirmDefinition,
  type BuildTableDefinition,
  type BuildTableQueryState,
  type BuildTableRequestActionDefinition,
  type BuildTableSortDirection,
  createBuildTableRequestDescriptor,
  resolveBuildTableRemoteListResult,
  resolveBuildTableRemoteListUrl,
  createBuildTableQuerySearchParams,
  formatBuildTablePaginationSummary,
  normalizeBuildTableQueryState,
  resolveBuildTableView
} from '@skitsaas/sdk/datatables';
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
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
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
import { notify } from '@skitsaas/sdk';
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

type ControlSlotRenderer = ({
  slot,
  fallback,
  data
}: {
  slot: string;
  fallback: React.ReactNode;
  data?: Record<string, unknown>;
}) => React.ReactNode;

type SharedThemeContext = {
  template?: DataTableThemeTemplate;
  frameClassName?: string;
  tableClassName?: string;
  renderControlSlot: ControlSlotRenderer;
  hasThemeCodeTemplate: boolean;
  resolvedThemeId: string | null;
  resolvedTemplateArea: string | null;
  resolvedTemplateComponentId: string;
  resolvedTemplateId: string | null;
  resolvedTemplateSource: string | null;
};

interface DataTableProps<TData extends Record<string, unknown>, TValue> {
  columns?: ColumnDef<TData, TValue>[];
  data?: TData[];
  definition?: BuildTableDefinition<TData>;
  className?: string;
  query?: BuildTableQueryState;
  onQueryChange?: (query: BuildTableQueryState) => void;
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

function joinClassNames(...values: Array<string | undefined>) {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

function readCellValue<TData extends Record<string, unknown>>(
  item: TData,
  key: keyof TData | string
) {
  if (typeof key !== 'string') {
    return item[key];
  }

  return item[key as keyof TData];
}

type HostResolvedBuildTableView<TData extends Record<string, unknown>> = {
  items: TData[];
  totalItems: number;
  filteredItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sorting: BuildTableQueryState['sorting'];
  filters: Record<string, string>;
  search: string;
  startRow: number;
  endRow: number;
};

function renderBuildTableActionContent(action: {
  leadingVisual?: React.ReactNode;
  label?: React.ReactNode;
  trailingVisual?: React.ReactNode;
}) {
  return (
    <>
      {action.leadingVisual}
      {action.label}
      {action.trailingVisual}
    </>
  );
}

function resolveBuildTableRequestErrorMessage(
  action: BuildTableRequestActionDefinition,
  responseStatus?: number
) {
  if (action.request.errorMessage) {
    return action.request.errorMessage;
  }

  if (typeof responseStatus === 'number') {
    return `Request failed (${responseStatus}).`;
  }

  return 'Request failed.';
}

function HostBuildTableActionButton({
  action,
  onActionSuccess
}: {
  action: Exclude<BuildTableActionDefinition, { kind: 'custom' | 'link' }>;
  onActionSuccess?: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const content = renderBuildTableActionContent(action);
  const confirm = action.confirm;

  const executeRequest = React.useCallback(async () => {
    if (action.kind !== 'request' || pending) {
      return;
    }

    setPending(true);
    try {
      const descriptor = createBuildTableRequestDescriptor(action.request);
      const response = await fetch(descriptor.url, descriptor.init);

      if (!response.ok) {
        throw new Error(
          resolveBuildTableRequestErrorMessage(action, response.status)
        );
      }

      if (action.request.successMessage) {
        notify.success(action.request.successMessage);
      }

      if (action.request.reload !== false) {
        onActionSuccess?.();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : resolveBuildTableRequestErrorMessage(action);
      notify.error(message);
    } finally {
      setPending(false);
    }
  }, [action, onActionSuccess, pending]);

  if (action.kind === 'button' && confirm) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={action.className}
            disabled={action.disabled || pending}
            title={action.title}
          >
            {content}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="sdk-data-table__confirm-dialog">
          <AlertDialogHeader className="sdk-data-table__confirm-header">
            <AlertDialogTitle className="sdk-data-table__confirm-title">
              {confirm.title}
            </AlertDialogTitle>
            {confirm.description ? (
              <AlertDialogDescription className="sdk-data-table__confirm-description">
                {confirm.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="sdk-data-table__confirm-actions">
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                {confirm.cancelLabel}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type={action.type ?? 'submit'}
                form={action.formId}
                name={action.name}
                value={action.value}
                disabled={action.disabled || pending}
                title={action.title}
              >
                {confirm.confirmLabel}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (action.kind === 'request') {
    if (confirm) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={action.className}
              disabled={action.disabled || pending}
              title={action.title}
            >
              {content}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sdk-data-table__confirm-dialog">
            <AlertDialogHeader className="sdk-data-table__confirm-header">
              <AlertDialogTitle className="sdk-data-table__confirm-title">
                {confirm.title}
              </AlertDialogTitle>
              {confirm.description ? (
                <AlertDialogDescription className="sdk-data-table__confirm-description">
                  {confirm.description}
                </AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            <AlertDialogFooter className="sdk-data-table__confirm-actions">
              <AlertDialogCancel asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  {confirm.cancelLabel}
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    void executeRequest();
                  }}
                >
                  {pending ? 'Working...' : confirm.confirmLabel}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={action.className}
        disabled={action.disabled || pending}
        title={action.title}
        onClick={() => {
          void executeRequest();
        }}
      >
        {content}
      </Button>
    );
  }

  return (
    <Button
      type={action.type ?? 'button'}
      size="sm"
      variant="outline"
      className={action.className}
      disabled={action.disabled}
      name={action.name}
      value={action.value}
      title={action.title}
      form={action.formId}
    >
      {content}
    </Button>
  );
}

function renderTableSurface({
  tableMarkup,
  shared
}: {
  tableMarkup: React.ReactNode;
  shared: SharedThemeContext;
}) {
  const fallbackTableSurface = (
    <div className={cn('overflow-hidden rounded-md border', shared.frameClassName)}>
      {tableMarkup}
    </div>
  );

  return shared.hasThemeCodeTemplate ? (
    <ThemeTemplate
      id={shared.resolvedTemplateComponentId}
      themeId={shared.resolvedThemeId}
      data={{
        area: shared.resolvedTemplateArea,
        componentId: shared.resolvedTemplateComponentId,
        templateId: shared.resolvedTemplateId,
        templateSource: shared.resolvedTemplateSource,
        frameClassName: shared.frameClassName,
        tableClassName: shared.tableClassName,
        containerClassName: shared.template?.payload?.containerClassName
      }}
      fallback={fallbackTableSurface}
    >
      {tableMarkup}
    </ThemeTemplate>
  ) : (
    fallbackTableSurface
  );
}

function renderBuildTableAction(
  action: BuildTableActionDefinition,
  key: string | number,
  onActionSuccess?: () => void
) {
  if (action.kind === 'custom') {
    return (
      <React.Fragment key={action.id ?? key}>{action.render}</React.Fragment>
    );
  }

  const content = renderBuildTableActionContent(action);

  if (action.kind === 'link') {
    return (
      <Button
        key={action.id ?? key}
        asChild
        size="sm"
        variant="outline"
        className={action.className}
      >
        <a href={action.href} target={action.target} rel={action.rel} title={action.title}>
          {content}
        </a>
      </Button>
    );
  }

  return (
    <HostBuildTableActionButton
      key={action.id ?? key}
      action={action}
      onActionSuccess={onActionSuccess}
    />
  );
}

function renderBuildTableActionGroup({
  actions,
  content,
  className,
  onActionSuccess
}: {
  actions?: BuildTableActionDefinition[];
  content?: React.ReactNode;
  className?: string;
  onActionSuccess?: () => void;
}) {
  if ((!actions || actions.length === 0) && !content) {
    return null;
  }

  return (
    <div className={className}>
      {actions?.map((action, index) =>
        renderBuildTableAction(action, index, onActionSuccess)
      )}
      {content}
    </div>
  );
}

function resolveSortingIndicator(direction: BuildTableSortDirection | null) {
  if (direction === 'asc') {
    return '▲';
  }

  if (direction === 'desc') {
    return '▼';
  }

  return '↕';
}

function formatDefinitionSummary({
  label,
  shownRows,
  filteredRows,
  startRow,
  endRow
}: {
  label: string;
  shownRows: number;
  filteredRows: number;
  startRow: number;
  endRow: number;
}) {
  if (
    label.includes('{start}') ||
    label.includes('{end}') ||
    label.includes('{total}')
  ) {
    return formatBuildTablePaginationSummary({
      startRow,
      endRow,
      totalItems: filteredRows,
      label
    });
  }

  return label
    .replace('{shown}', String(shownRows))
    .replace('{filtered}', String(filteredRows));
}

function BuildTableDefinitionRenderer<TData extends Record<string, unknown>>({
  definition,
  className,
  query,
  onQueryChange,
  labels,
  emptyMessage,
  filterPlaceholder,
  toolbarActions,
  shared
}: {
  definition: BuildTableDefinition<TData>;
  className?: string;
  query?: BuildTableQueryState;
  onQueryChange?: (query: BuildTableQueryState) => void;
  labels: DataTableLabels;
  emptyMessage?: string;
  filterPlaceholder?: string;
  toolbarActions?: React.ReactNode;
  shared: SharedThemeContext;
}) {
  const initialQuery = normalizeBuildTableQueryState(
    query ?? definition.query,
    definition
  );
  const [search, setSearch] = React.useState(initialQuery.search ?? '');
  const deferredSearch = React.useDeferredValue(search);
  const [filters, setFilters] = React.useState(initialQuery.filters ?? {});
  const [sorting, setSorting] = React.useState(initialQuery.sorting ?? null);
  const [page, setPage] = React.useState(initialQuery.page ?? 1);
  const [pageSize, setPageSize] = React.useState(initialQuery.pageSize ?? 10);
  const [reloadToken, setReloadToken] = React.useState(0);
  const localView = resolveBuildTableView(definition, {
    search: deferredSearch,
    filters,
    sorting,
    page,
    pageSize
  });
  const remoteSource = definition.source;
  const remoteQuery: BuildTableQueryState = {
    search: deferredSearch,
    filters,
    sorting,
    page,
    pageSize
  };
  const remoteQueryKey = remoteSource
    ? createBuildTableQuerySearchParams(
        remoteQuery,
        remoteSource.queryOptions
      ).toString()
    : '';
  const [remoteState, setRemoteState] = React.useState<{
    items: TData[];
    totalItems: number;
    page: number;
    pageSize: number;
    loading: boolean;
    error: string | null;
  }>({
    items: definition.data,
    totalItems: definition.data.length,
    page: initialQuery.page ?? 1,
    pageSize: initialQuery.pageSize ?? 10,
    loading: false,
    error: null
  });

  React.useEffect(() => {
    if (!remoteSource) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRemoteState((current) => ({
        ...current,
        loading: true,
        error: null
      }));

      try {
        const url = resolveBuildTableRemoteListUrl(remoteSource, remoteQuery);
        const response = await fetch(url, {
          method: 'GET',
          headers: remoteSource.headers,
          credentials: remoteSource.credentials,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status}).`);
        }

        const payload = await response.json();
        const result = resolveBuildTableRemoteListResult<TData>(
          payload,
          remoteSource
        );

        setRemoteState({
          items: result.items,
          totalItems: result.total,
          page: result.page ?? remoteQuery.page ?? 1,
          pageSize: result.pageSize ?? remoteQuery.pageSize ?? 10,
          loading: false,
          error: null
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Could not load table data.';
        setRemoteState((current) => ({
          ...current,
          loading: false,
          error: message
        }));
        notify.error(message);
      }
    }, remoteSource.debounceMs ?? 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    deferredSearch,
    filters,
    page,
    pageSize,
    reloadToken,
    remoteQueryKey,
    remoteSource?.credentials,
    remoteSource?.debounceMs,
    remoteSource?.headers,
    remoteSource?.response,
    remoteSource?.url,
    sorting
  ]);

  const view: HostResolvedBuildTableView<TData> = remoteSource
    ? {
        items: remoteState.items,
        totalItems: remoteState.totalItems,
        filteredItems: remoteState.totalItems,
        page: remoteState.page,
        pageSize: remoteState.pageSize,
        totalPages: Math.max(
          1,
          Math.ceil(
            remoteState.totalItems / Math.max(1, remoteState.pageSize || 1)
          )
        ),
        sorting,
        filters,
        search: deferredSearch,
        startRow:
          remoteState.totalItems > 0
            ? (remoteState.page - 1) * remoteState.pageSize + 1
            : 0,
        endRow:
          remoteState.totalItems > 0
            ? Math.min(
                remoteState.totalItems,
                (remoteState.page - 1) * remoteState.pageSize +
                  remoteState.items.length
              )
            : 0
      }
    : localView;

  React.useEffect(() => {
    if (!onQueryChange) {
      return;
    }

    onQueryChange({
      search: deferredSearch,
      filters: view.filters,
      sorting: view.sorting,
      page: view.page,
      pageSize: view.pageSize
    });
  }, [
    deferredSearch,
    onQueryChange,
    view.filters,
    view.page,
    view.pageSize,
    view.sorting
  ]);

  const refreshRemoteData = React.useCallback(() => {
    if (!remoteSource) {
      return;
    }

    setReloadToken((current) => current + 1);
  }, [remoteSource]);

  const headerFallback =
    definition.header &&
    (definition.header.title ||
      definition.header.description ||
      definition.header.content ||
      definition.header.actions?.length) ? (
      <div
        className={joinClassNames(
          'sdk-data-table__header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
          definition.header.className
        )}
      >
        <div
          className={joinClassNames(
            'sdk-data-table__header-content space-y-1',
            definition.header.contentClassName
          )}
        >
          {definition.header.title ? (
            <h3
              className={joinClassNames(
                'sdk-data-table__header-title text-base font-semibold',
                definition.header.titleClassName
              )}
            >
              {definition.header.title}
            </h3>
          ) : null}
          {definition.header.description ? (
            <p
              className={joinClassNames(
                'sdk-data-table__header-description text-sm text-muted-foreground',
                definition.header.descriptionClassName
              )}
            >
              {definition.header.description}
            </p>
          ) : null}
          {definition.header.content}
        </div>
        {renderBuildTableActionGroup({
          actions: definition.header.actions,
          className: joinClassNames(
            'sdk-data-table__header-actions flex items-center gap-2',
            definition.header.actionsClassName
          ),
          onActionSuccess: refreshRemoteData
        })}
      </div>
    ) : null;
  const headerSection = headerFallback
    ? shared.renderControlSlot({
        slot: 'header',
        fallback: headerFallback
      })
    : null;

  const searchInputFallback =
    definition.toolbar?.search?.enabled === true ? (
      <Input
        placeholder={
          filterPlaceholder ||
          definition.toolbar.search.placeholder ||
          labels.filterPlaceholder
        }
        value={search}
        onChange={(event) => {
          const nextValue = event.target.value;
          React.startTransition(() => {
            setSearch(nextValue);
            setPage(1);
          });
        }}
        className={cn(
          'sdk-data-table__toolbar-search sm:max-w-sm',
          definition.toolbar.search.className
        )}
      />
    ) : null;
  const searchInput = searchInputFallback
    ? shared.renderControlSlot({
        slot: 'toolbar.filter',
        fallback: searchInputFallback
      })
    : null;
  const filtersFallback =
    definition.toolbar?.filters && definition.toolbar.filters.length > 0 ? (
      <div
        className={joinClassNames(
          'sdk-data-table__toolbar-filters flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center',
          definition.toolbar.filtersClassName
        )}
      >
        {definition.toolbar.filters.map((filter) => {
          const value = filters[filter.id] ?? '';

          const fallback =
            filter.kind === 'select' ? (
              <label
                key={filter.id}
                className={joinClassNames(
                  'sdk-data-table__filter flex items-center gap-2',
                  filter.className
                )}
              >
                {filter.label ? (
                  <span className="sdk-data-table__filter-label text-sm text-muted-foreground">
                    {filter.label}
                  </span>
                ) : null}
                <select
                  value={value}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    React.startTransition(() => {
                      setFilters((current) => ({
                        ...current,
                        [filter.id]: nextValue
                      }));
                      setPage(1);
                    });
                  }}
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
                >
                  <option value="">{filter.placeholder ?? 'All'}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label
                key={filter.id}
                className={joinClassNames(
                  'sdk-data-table__filter flex items-center gap-2',
                  filter.className
                )}
              >
                {filter.label ? (
                  <span className="sdk-data-table__filter-label text-sm text-muted-foreground">
                    {filter.label}
                  </span>
                ) : null}
                <Input
                  value={value}
                  placeholder={filter.placeholder}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    React.startTransition(() => {
                      setFilters((current) => ({
                        ...current,
                        [filter.id]: nextValue
                      }));
                      setPage(1);
                    });
                  }}
                  className="sm:max-w-sm"
                />
              </label>
            );

          return shared.renderControlSlot({
            slot: 'toolbar.filter.field',
            fallback,
            data: {
              filterId: filter.id,
              filterKind: filter.kind ?? 'text'
            }
          });
        })}
      </div>
    ) : null;
  const filtersGroup = filtersFallback
    ? shared.renderControlSlot({
        slot: 'toolbar.filters',
        fallback: filtersFallback
      })
    : null;
  const toolbarActionsFallback =
    definition.toolbar?.actions?.length || toolbarActions ? (
      <div className="sdk-data-table__toolbar-actions flex items-center gap-2 sm:ml-auto">
        {renderBuildTableActionGroup({
          actions: definition.toolbar?.actions,
          content: toolbarActions,
          onActionSuccess: refreshRemoteData
        })}
      </div>
    ) : null;
  const toolbarActionsSlot = toolbarActionsFallback
    ? shared.renderControlSlot({
        slot: 'toolbar.actions',
        fallback: toolbarActionsFallback,
        data: {
          hasCustomActions: Boolean(toolbarActions),
          hasColumnToggle: false
        }
      })
    : null;
  const toolbarFallback =
    searchInput || filtersGroup || definition.toolbar?.content || toolbarActionsSlot ? (
      <div className="sdk-data-table__toolbar flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sdk-data-table__toolbar-content flex flex-1 flex-col gap-2">
          {searchInput}
          {filtersGroup}
          {definition.toolbar?.content}
        </div>
        {toolbarActionsSlot}
      </div>
    ) : null;
  const toolbar = toolbarFallback
    ? shared.renderControlSlot({
        slot: 'toolbar',
        fallback: toolbarFallback
      })
    : null;
  const emptyStateFallback = remoteState.loading ? (
    <span className="sdk-data-table__empty">Loading...</span>
  ) : remoteState.error ? (
    <span className="sdk-data-table__empty">{remoteState.error}</span>
  ) : (
    <span className="sdk-data-table__empty">
      {emptyMessage || definition.labels?.empty || labels.noResults}
    </span>
  );
  const emptyState = shared.renderControlSlot({
    slot: 'body.empty',
    fallback: emptyStateFallback
  });
  const tableMarkup = (
    <Table
      className={cn(
        'sdk-data-table__table',
        shared.template?.payload?.tableClassName,
        shared.tableClassName
      )}
      containerClassName={shared.template?.payload?.containerClassName}
      templateComponentId={shared.resolvedTemplateComponentId}
      templateId={shared.resolvedTemplateId}
      templateSource={shared.resolvedTemplateSource}
    >
      <TableHeader>
        <TableRow>
          {definition.columns.map((column, index) => {
            const columnId = String(column.key);
            const sortDirection =
              view.sorting?.columnId === columnId ? view.sorting.direction : null;
            const fallbackHeader = column.sortable ? (
              <Button
                variant="ghost"
                size="sm"
                className="sdk-data-table__sort-button -ml-3"
                onClick={() => {
                  React.startTransition(() => {
                    setSorting((current) => {
                      if (!current || current.columnId !== columnId) {
                        return {
                          columnId,
                          direction: 'asc'
                        };
                      }

                      if (current.direction === 'asc') {
                        return {
                          columnId,
                          direction: 'desc'
                        };
                      }

                      return null;
                    });
                    setPage(1);
                  });
                }}
              >
                {column.header}
                <span className="sdk-data-table__sort-indicator ml-2">
                  {resolveSortingIndicator(sortDirection)}
                </span>
              </Button>
            ) : (
              column.header
            );

            return (
              <TableHead key={`${columnId}-${index}`} className={column.headerClassName}>
                {fallbackHeader}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {view.items.length ? (
          view.items.map((row, rowIndex) => (
            <TableRow key={`${rowIndex}`}>
              {definition.columns.map((column, columnIndex) => (
                <TableCell key={`${String(column.key)}-${columnIndex}`} className={column.className}>
                  {column.actions
                    ? renderBuildTableActionGroup({
                        actions:
                          typeof column.actions === 'function'
                            ? column.actions(row)
                            : column.actions,
                        className: joinClassNames(
                          'sdk-data-table__cell-actions flex flex-wrap items-center gap-2',
                          column.actionsClassName
                        ),
                        onActionSuccess: refreshRemoteData
                      })
                    : column.cell
                      ? column.cell(row)
                      : String(readCellValue(row, column.key) ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={definition.columns.length}
              className="h-24 text-center"
            >
              {emptyState}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
  const tableSurface = renderTableSurface({
    tableMarkup,
    shared
  });
  const summaryLabel =
    definition.pagination?.summaryLabel ?? labels.showingRows;
  const paginationSummaryFallback = (
    <p className="sdk-data-table__pagination-summary text-muted-foreground text-xs sm:text-sm">
      {formatDefinitionSummary({
        label: summaryLabel,
        shownRows: view.items.length,
        filteredRows: view.filteredItems,
        startRow: view.startRow,
        endRow: view.endRow
      })}
    </p>
  );
  const paginationSummary = shared.renderControlSlot({
    slot: 'pagination.summary',
    fallback: paginationSummaryFallback,
    data: {
      shownRows: view.items.length,
      filteredRows: view.filteredItems
    }
  });
  const previousButtonFallback = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        React.startTransition(() => {
          setPage((current) => Math.max(1, current - 1));
        });
      }}
      disabled={view.page <= 1}
    >
      {definition.pagination?.previousLabel ?? labels.previous}
    </Button>
  );
  const previousButton = shared.renderControlSlot({
    slot: 'pagination.previous',
    fallback: previousButtonFallback,
    data: {
      disabled: view.page <= 1
    }
  });
  const nextButtonFallback = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        React.startTransition(() => {
          setPage((current) => Math.min(view.totalPages, current + 1));
        });
      }}
      disabled={view.page >= view.totalPages}
    >
      {definition.pagination?.nextLabel ?? labels.next}
    </Button>
  );
  const nextButton = shared.renderControlSlot({
    slot: 'pagination.next',
    fallback: nextButtonFallback,
    data: {
      disabled: view.page >= view.totalPages
    }
  });
  const pageSizeOptions =
    definition.pagination?.pageSizeOptions &&
    definition.pagination.pageSizeOptions.length > 0 ? (
      <label className="sdk-data-table__pagination-page-size flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows</span>
        <select
          value={String(pageSize)}
          onChange={(event) => {
            const nextPageSize = Number.parseInt(event.currentTarget.value, 10);
            React.startTransition(() => {
              setPageSize(nextPageSize);
              setPage(1);
            });
          }}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none"
        >
          {definition.pagination.pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    ) : null;
  const paginationActionsFallback = (
    <div
      className={joinClassNames(
        'sdk-data-table__pagination-actions ml-auto flex items-center gap-2',
        definition.pagination?.actionsClassName
      )}
    >
      {pageSizeOptions}
      <span className="text-xs text-muted-foreground">
        Page {view.page} of {view.totalPages}
      </span>
      {previousButton}
      {nextButton}
    </div>
  );
  const paginationActions = shared.renderControlSlot({
    slot: 'pagination.actions',
    fallback: paginationActionsFallback
  });
  const paginationFallback = (
    <div
      className={joinClassNames(
        'sdk-data-table__pagination flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        definition.pagination?.className
      )}
    >
      {definition.pagination?.showSummary === false ? null : paginationSummary}
      {paginationActions}
    </div>
  );
  const pagination = shared.renderControlSlot({
    slot: 'pagination',
    fallback: paginationFallback
  });

  return (
    <div className={cn('sdk-data-table space-y-4', definition.className, className)}>
      {headerSection}
      {toolbar}
      {tableSurface}
      {pagination}
    </div>
  );
}

export function DataTable<TData extends Record<string, unknown>, TValue>({
  columns,
  data,
  definition,
  className,
  query,
  onQueryChange,
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
  const renderControlSlot: ControlSlotRenderer = ({
    slot,
    fallback,
    data
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
  const sharedThemeContext: SharedThemeContext = {
    template,
    frameClassName,
    tableClassName,
    renderControlSlot,
    hasThemeCodeTemplate,
    resolvedThemeId,
    resolvedTemplateArea,
    resolvedTemplateComponentId,
    resolvedTemplateId,
    resolvedTemplateSource
  };

  if (definition) {
    return (
      <BuildTableDefinitionRenderer
        definition={{
          ...definition,
          ...(tableClassName
            ? {
                tableClassName: cn(definition.tableClassName, tableClassName)
              }
            : {}),
          ...(query
            ? {
                query: {
                  ...(definition.query ?? {}),
                  ...query
                }
              }
            : {})
        }}
        className={className}
        query={query}
        onQueryChange={onQueryChange}
        labels={dataTable}
        emptyMessage={emptyMessage}
        filterPlaceholder={filterPlaceholder}
        toolbarActions={toolbarActions}
        shared={sharedThemeContext}
      />
    );
  }

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    () => initialColumnVisibility ?? {}
  );

  const table = useReactTable({
    data: data ?? [],
    columns: columns ?? [],
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
  const filterInputFallback = filterableColumn ? (
    <Input
      placeholder={filterPlaceholder || dataTable.filterPlaceholder}
      value={(filterableColumn.getFilterValue() as string) ?? ''}
      onChange={(event) => filterableColumn.setFilterValue(event.target.value)}
      className="sdk-data-table__toolbar-search sm:max-w-sm"
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
    <div className="sdk-data-table__toolbar-actions flex items-center gap-2 sm:ml-auto">
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
      <div className="sdk-data-table__toolbar flex flex-col gap-3 sm:flex-row sm:items-center">
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
  const emptyStateFallback = (
    <span className="sdk-data-table__empty">
      {emptyMessage || dataTable.noResults}
    </span>
  );
  const emptyState = renderControlSlot({
    slot: 'body.empty',
    fallback: emptyStateFallback
  });
  const tableMarkup = (
    <Table
      className={cn(
        'sdk-data-table__table',
        template?.payload?.tableClassName,
        tableClassName
      )}
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
  const tableSurface = renderTableSurface({
    tableMarkup,
    shared: sharedThemeContext
  });
  const paginationSummaryFallback = (
    <p className="sdk-data-table__pagination-summary text-muted-foreground text-xs sm:text-sm">
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
    <div className="sdk-data-table__pagination-actions ml-auto flex items-center gap-2">
      {previousButton}
      {nextButton}
    </div>
  );
  const paginationActions = renderControlSlot({
    slot: 'pagination.actions',
    fallback: paginationActionsFallback
  });
  const paginationFallback = (
    <div className="sdk-data-table__pagination flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {paginationSummary}
      {paginationActions}
    </div>
  );
  const pagination = renderControlSlot({
    slot: 'pagination',
    fallback: paginationFallback
  });

  return (
    <div className={cn('sdk-data-table space-y-4', className)}>
      {toolbar}
      {tableSurface}
      {pagination}
    </div>
  );
}
