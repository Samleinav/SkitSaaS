'use client';

import * as React from 'react';
import type {
  BuildTableActionDefinition,
  BuildTableButtonActionDefinition,
  BuildTableColumn,
  BuildTableConfirmDefinition,
  BuildTableDefinition,
  BuildTableHeaderDefinition,
  BuildTableLabels,
  BuildTablePaginationDefinition,
  BuildTableQueryState,
  BuildTableRequestActionDefinition,
  BuildTableSortDirection,
  BuildTableToolbarDefinition
} from '../datatables/definition.js';
import {
  createBuildTableRequestDescriptor,
  resolveBuildTableRemoteListResult,
  resolveBuildTableRemoteListUrl
} from '../datatables/remote.js';
import {
  createBuildTableQuerySearchParams,
} from '../datatables/query.js';
import {
  formatBuildTablePaginationSummary,
  normalizeBuildTableQueryState,
  resolveBuildTableView
} from '../datatables/state.js';
import { notify } from './notify.js';

export type SdkDataTableLabels = BuildTableLabels;
export type SdkDataTableColumn<TItem extends Record<string, unknown>> =
  BuildTableColumn<TItem>;

export type DataTableProps<TItem extends Record<string, unknown>> = {
  definition?: BuildTableDefinition<TItem>;
  data?: TItem[];
  columns?: SdkDataTableColumn<TItem>[];
  labels?: SdkDataTableLabels;
  className?: string;
  tableClassName?: string;
  emptyState?: React.ReactNode;
  header?: BuildTableHeaderDefinition;
  toolbar?: BuildTableToolbarDefinition<TItem>;
  pagination?: BuildTablePaginationDefinition;
  query?: BuildTableQueryState;
  onQueryChange?: (query: BuildTableQueryState) => void;
};

function joinClassNames(...values: Array<string | undefined>) {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

function readCellValue<TItem extends Record<string, unknown>>(
  item: TItem,
  key: keyof TItem | string
) {
  if (typeof key !== 'string') {
    return item[key];
  }

  return item[key as keyof TItem];
}

type SdkResolvedBuildTableView<TItem extends Record<string, unknown>> = {
  items: TItem[];
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

function renderActionContent(action: {
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

function buildRequestErrorMessage(
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

function PortableConfirmDialog({
  definition,
  pending,
  onCancel,
  confirmButton
}: {
  definition: BuildTableConfirmDefinition;
  pending?: boolean;
  onCancel: () => void;
  confirmButton: React.ReactNode;
}) {
  return (
    <div className="sdk-data-table__confirm-backdrop" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        className="sdk-data-table__confirm-dialog"
      >
        <div className="sdk-data-table__confirm-header">
          <h3 className="sdk-data-table__confirm-title">{definition.title}</h3>
          {definition.description ? (
            <p className="sdk-data-table__confirm-description">
              {definition.description}
            </p>
          ) : null}
        </div>
        <div className="sdk-data-table__confirm-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="sdk-data-table__confirm-cancel"
          >
            {definition.cancelLabel}
          </button>
          {confirmButton}
        </div>
      </div>
    </div>
  );
}

function SdkTableActionButton({
  action,
  onActionSuccess
}: {
  action: Exclude<BuildTableActionDefinition, { kind: 'custom' | 'link' }>;
  onActionSuccess?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const content = renderActionContent(action);
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
        throw new Error(buildRequestErrorMessage(action, response.status));
      }

      if (action.request.successMessage) {
        notify.success(action.request.successMessage);
      }

      if (action.request.reload !== false) {
        onActionSuccess?.();
      }

      setConfirmOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : buildRequestErrorMessage(action);
      notify.error(message);
    } finally {
      setPending(false);
    }
  }, [action, onActionSuccess, pending]);

  if (action.kind === 'button' && action.formId && confirm) {
    return (
      <React.Fragment key={action.id}>
        <button
          type="button"
          title={action.title}
          className={action.className}
          disabled={action.disabled || pending}
          onClick={() => setConfirmOpen(true)}
        >
          {content}
        </button>
        {confirmOpen && confirm ? (
          <PortableConfirmDialog
            definition={confirm}
            pending={pending}
            onCancel={() => setConfirmOpen(false)}
            confirmButton={
              <button
                type="submit"
                form={action.formId}
                name={action.name}
                value={action.value}
                className={action.className}
                onClick={() => setConfirmOpen(false)}
              >
                {confirm.confirmLabel}
              </button>
            }
          />
        ) : null}
      </React.Fragment>
    );
  }

  if (action.kind === 'request') {
    return (
      <React.Fragment key={action.id}>
        <button
          type="button"
          title={action.title}
          className={action.className}
          disabled={action.disabled || pending}
          onClick={() => {
            if (confirm) {
              setConfirmOpen(true);
              return;
            }

            void executeRequest();
          }}
        >
          {content}
        </button>
        {confirmOpen && confirm ? (
          <PortableConfirmDialog
            definition={confirm}
            pending={pending}
            onCancel={() => setConfirmOpen(false)}
            confirmButton={
              <button
                type="button"
                className={action.className}
                disabled={pending}
                onClick={() => {
                  void executeRequest();
                }}
              >
                {pending ? 'Working...' : confirm.confirmLabel}
              </button>
            }
          />
        ) : null}
      </React.Fragment>
    );
  }

  return (
    <button
      key={action.id}
      type={action.type ?? 'button'}
      title={action.title}
      className={action.className}
      disabled={action.disabled}
      name={action.name}
      value={action.value}
      form={action.formId}
    >
      {content}
    </button>
  );
}

function renderAction(
  action: BuildTableActionDefinition,
  key: string | number,
  onActionSuccess?: () => void
) {
  if (action.kind === 'custom') {
    return (
      <React.Fragment key={action.id ?? key}>{action.render}</React.Fragment>
    );
  }

  const content = renderActionContent(action);

  if (action.kind === 'link') {
    return (
      <a
        key={action.id ?? key}
        href={action.href}
        target={action.target}
        rel={action.rel}
        title={action.title}
        className={action.className}
      >
        {content}
      </a>
    );
  }

  return (
    <SdkTableActionButton
      key={action.id ?? key}
      action={action}
      onActionSuccess={onActionSuccess}
    />
  );
}

function renderActionGroup({
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
        renderAction(action, index, onActionSuccess)
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

function buildResolvedDefinition<TItem extends Record<string, unknown>>({
  definition,
  data,
  columns,
  labels,
  className,
  tableClassName,
  emptyState,
  header,
  toolbar,
  pagination,
  query
}: Omit<DataTableProps<TItem>, 'onQueryChange'>): BuildTableDefinition<TItem> {
  if (definition) {
    return {
      ...definition,
      ...(data ? { data } : {}),
      ...(columns ? { columns } : {}),
      ...(labels ? { labels: { ...(definition.labels ?? {}), ...labels } } : {}),
      ...(className ? { className } : {}),
      ...(tableClassName ? { tableClassName } : {}),
      ...(emptyState ? { emptyState } : {}),
      ...(header ? { header: { ...(definition.header ?? {}), ...header } } : {}),
      ...(toolbar
        ? {
            toolbar: {
              ...(definition.toolbar ?? {}),
              ...toolbar
            }
          }
        : {}),
      ...(pagination
        ? {
            pagination: {
              ...(definition.pagination ?? {}),
              ...pagination
            }
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
    };
  }

  return {
    data: Array.isArray(data) ? data : [],
    columns: Array.isArray(columns) ? columns : [],
    labels,
    className,
    tableClassName,
    emptyState,
    header,
    toolbar,
    pagination,
    query
  };
}

export function DataTable<TItem extends Record<string, unknown>>({
  definition,
  data,
  columns,
  labels,
  className,
  tableClassName,
  emptyState,
  header,
  toolbar,
  pagination,
  query,
  onQueryChange
}: DataTableProps<TItem>) {
  const resolvedDefinition = buildResolvedDefinition({
    definition,
    data,
    columns,
    labels,
    className,
    tableClassName,
    emptyState,
    header,
    toolbar,
    pagination,
    query
  });
  const initialQuery = normalizeBuildTableQueryState(
    query ?? resolvedDefinition.query,
    resolvedDefinition
  );
  const [search, setSearch] = React.useState(initialQuery.search ?? '');
  const deferredSearch = React.useDeferredValue(search);
  const [filters, setFilters] = React.useState(initialQuery.filters ?? {});
  const [sorting, setSorting] = React.useState(initialQuery.sorting ?? null);
  const [page, setPage] = React.useState(initialQuery.page ?? 1);
  const [pageSize, setPageSize] = React.useState(initialQuery.pageSize ?? 10);
  const [reloadToken, setReloadToken] = React.useState(0);
  const localView = resolveBuildTableView(resolvedDefinition, {
    search: deferredSearch,
    filters,
    sorting,
    page,
    pageSize
  });
  const remoteSource = resolvedDefinition.source;
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
    items: TItem[];
    totalItems: number;
    page: number;
    pageSize: number;
    loading: boolean;
    error: string | null;
  }>({
    items: resolvedDefinition.data,
    totalItems: resolvedDefinition.data.length,
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
        const result = resolveBuildTableRemoteListResult<TItem>(
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

  const view: SdkResolvedBuildTableView<TItem> = remoteSource
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
    filters,
    onQueryChange,
    sorting,
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

  const headerNode = resolvedDefinition.header ? (
    <header
      className={joinClassNames(
        'sdk-data-table__header',
        resolvedDefinition.header.className
      )}
    >
      <div
        className={joinClassNames(
          'sdk-data-table__header-content',
          resolvedDefinition.header.contentClassName
        )}
      >
        {resolvedDefinition.header.title ? (
          <h2
            className={joinClassNames(
              'sdk-data-table__header-title',
              resolvedDefinition.header.titleClassName
            )}
          >
            {resolvedDefinition.header.title}
          </h2>
        ) : null}
        {resolvedDefinition.header.description ? (
          <p
            className={joinClassNames(
              'sdk-data-table__header-description',
              resolvedDefinition.header.descriptionClassName
            )}
          >
            {resolvedDefinition.header.description}
          </p>
        ) : null}
        {resolvedDefinition.header.content}
      </div>
      {renderActionGroup({
        actions: resolvedDefinition.header.actions,
        className: joinClassNames(
          'sdk-data-table__header-actions',
          resolvedDefinition.header.actionsClassName
        ),
        onActionSuccess: refreshRemoteData
      })}
    </header>
  ) : null;

  const searchNode =
    resolvedDefinition.toolbar?.search?.enabled === true ? (
      <input
        type="search"
        value={search}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          React.startTransition(() => {
            setSearch(nextValue);
            setPage(1);
          });
        }}
        placeholder={
          resolvedDefinition.toolbar.search.placeholder ?? 'Search...'
        }
        className={joinClassNames(
          'sdk-data-table__toolbar-search',
          resolvedDefinition.toolbar.search.className
        )}
      />
    ) : null;

  const filtersNode =
    resolvedDefinition.toolbar?.filters &&
    resolvedDefinition.toolbar.filters.length > 0 ? (
      <div
        className={joinClassNames(
          'sdk-data-table__toolbar-filters',
          resolvedDefinition.toolbar.filtersClassName
        )}
      >
        {resolvedDefinition.toolbar.filters.map((filter) => {
          const filterValue = filters[filter.id] ?? '';

          if (filter.kind === 'select') {
            return (
              <label
                key={filter.id}
                className={joinClassNames(
                  'sdk-data-table__filter',
                  filter.className
                )}
              >
                {filter.label ? (
                  <span className="sdk-data-table__filter-label">
                    {filter.label}
                  </span>
                ) : null}
                <select
                  value={filterValue}
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
                >
                  <option value="">{filter.placeholder ?? 'All'}</option>
                  {filter.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          return (
            <label
              key={filter.id}
              className={joinClassNames(
                'sdk-data-table__filter',
                filter.className
              )}
            >
              {filter.label ? (
                <span className="sdk-data-table__filter-label">
                  {filter.label}
                </span>
              ) : null}
              <input
                type="search"
                value={filterValue}
                placeholder={filter.placeholder}
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
              />
            </label>
          );
        })}
      </div>
    ) : null;

  const toolbarNode =
    resolvedDefinition.toolbar ||
    searchNode ||
    filtersNode ? (
      <div
        className={joinClassNames(
          'sdk-data-table__toolbar',
          resolvedDefinition.toolbar?.className
        )}
      >
        <div
          className={joinClassNames(
            'sdk-data-table__toolbar-content',
            resolvedDefinition.toolbar?.contentClassName
          )}
        >
          {searchNode}
          {filtersNode}
          {resolvedDefinition.toolbar?.content}
        </div>
        {renderActionGroup({
          actions: resolvedDefinition.toolbar?.actions,
          className: joinClassNames(
            'sdk-data-table__toolbar-actions',
            resolvedDefinition.toolbar?.actionsClassName
          ),
          onActionSuccess: refreshRemoteData
        })}
      </div>
    ) : null;

  const paginationDefinition = resolvedDefinition.pagination;
  const pageSizeOptions =
    paginationDefinition?.pageSizeOptions && paginationDefinition.pageSizeOptions.length > 0
      ? paginationDefinition.pageSizeOptions
      : null;
  const paginationSummaryLabel =
    paginationDefinition?.summaryLabel ?? 'Showing {start}-{end} of {total}';
  const paginationNode = (
    <div
      className={joinClassNames(
        'sdk-data-table__pagination',
        paginationDefinition?.className
      )}
    >
      {paginationDefinition?.showSummary !== false ? (
        <p
          className={joinClassNames(
            'sdk-data-table__pagination-summary',
            paginationDefinition?.summaryClassName
          )}
        >
          {formatBuildTablePaginationSummary({
            startRow: view.startRow,
            endRow: view.endRow,
            totalItems: view.filteredItems,
            label: paginationSummaryLabel
          })}
        </p>
      ) : null}
      <div
        className={joinClassNames(
          'sdk-data-table__pagination-actions',
          paginationDefinition?.actionsClassName
        )}
      >
        {pageSizeOptions ? (
          <label className="sdk-data-table__pagination-page-size">
            <span>Rows</span>
            <select
              value={String(pageSize)}
              onChange={(event) => {
                const nextPageSize = Number.parseInt(
                  event.currentTarget.value,
                  10
                );
                React.startTransition(() => {
                  setPageSize(nextPageSize);
                  setPage(1);
                });
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => {
            React.startTransition(() => {
              setPage((current) => Math.max(1, current - 1));
            });
          }}
          disabled={view.page <= 1}
        >
          {paginationDefinition?.previousLabel ?? 'Previous'}
        </button>
        <span className="sdk-data-table__pagination-page-indicator">
          Page {view.page} of {view.totalPages}
        </span>
        <button
          type="button"
          onClick={() => {
            React.startTransition(() => {
              setPage((current) => Math.min(view.totalPages, current + 1));
            });
          }}
          disabled={view.page >= view.totalPages}
        >
          {paginationDefinition?.nextLabel ?? 'Next'}
        </button>
      </div>
    </div>
  );
  const emptyStateNode = remoteState.loading ? (
    <p>Loading...</p>
  ) : remoteState.error ? (
    <p>{remoteState.error}</p>
  ) : (
    resolvedDefinition.emptyState ?? (
      <p>{resolvedDefinition.labels?.empty ?? 'No records found.'}</p>
    )
  );

  if (view.items.length === 0) {
    return (
      <div
        className={joinClassNames(
          'sdk-data-table',
          resolvedDefinition.className
        )}
      >
        {headerNode}
        {toolbarNode}
        <div className="sdk-data-table__empty">{emptyStateNode}</div>
        {paginationNode}
      </div>
    );
  }

  return (
    <div
      className={joinClassNames('sdk-data-table', resolvedDefinition.className)}
    >
      {headerNode}
      {toolbarNode}
      <table
        className={joinClassNames(
          'sdk-data-table__table',
          resolvedDefinition.tableClassName
        )}
      >
        <thead>
          <tr>
            {resolvedDefinition.columns.map((column, index) => {
              const columnId = String(column.key);
              const isSorted = view.sorting?.columnId === columnId;
              const sortDirection = isSorted ? view.sorting?.direction ?? null : null;

              return (
                <th
                  key={`${String(column.key)}-${index}`}
                  className={column.headerClassName}
                >
                  {column.sortable ? (
                    <button
                      type="button"
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
                      className="sdk-data-table__sort-button"
                    >
                      {column.header}
                      <span className="sdk-data-table__sort-indicator">
                        {resolveSortingIndicator(sortDirection)}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {view.items.map((item, rowIndex) => (
            <tr key={rowIndex}>
              {resolvedDefinition.columns.map((column, columnIndex) => (
                <td
                  key={`${String(column.key)}-${columnIndex}`}
                  className={column.className}
                >
                  {column.actions
                    ? renderActionGroup({
                        actions:
                          typeof column.actions === 'function'
                            ? column.actions(item)
                            : column.actions,
                        className: joinClassNames(
                          'sdk-data-table__cell-actions',
                          column.actionsClassName
                        ),
                        onActionSuccess: refreshRemoteData
                      })
                    : column.cell
                      ? column.cell(item)
                      : String(readCellValue(item, column.key) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {paginationNode}
    </div>
  );
}
