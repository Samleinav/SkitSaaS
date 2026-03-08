'use client';
import { Fragment as _Fragment, jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { createBuildTableRequestDescriptor, resolveBuildTableRemoteListResult, resolveBuildTableRemoteListUrl } from '../datatables/remote.js';
import { createBuildTableQuerySearchParams, } from '../datatables/query.js';
import { formatBuildTablePaginationSummary, normalizeBuildTableQueryState, resolveBuildTableView } from '../datatables/state.js';
import { notify } from './notify.js';
function joinClassNames(...values) {
    return values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .join(' ');
}
function readCellValue(item, key) {
    if (typeof key !== 'string') {
        return item[key];
    }
    return item[key];
}
function renderActionContent(action) {
    return (_jsxs(_Fragment, { children: [action.leadingVisual, action.label, action.trailingVisual] }));
}
function buildRequestErrorMessage(action, responseStatus) {
    if (action.request.errorMessage) {
        return action.request.errorMessage;
    }
    if (typeof responseStatus === 'number') {
        return `Request failed (${responseStatus}).`;
    }
    return 'Request failed.';
}
function PortableConfirmDialog({ definition, pending, onCancel, confirmButton }) {
    return (_jsx("div", { className: "sdk-data-table__confirm-backdrop", role: "presentation", children: _jsxs("div", { role: "dialog", "aria-modal": "true", className: "sdk-data-table__confirm-dialog", children: [_jsxs("div", { className: "sdk-data-table__confirm-header", children: [_jsx("h3", { className: "sdk-data-table__confirm-title", children: definition.title }), definition.description ? (_jsx("p", { className: "sdk-data-table__confirm-description", children: definition.description })) : null] }), _jsxs("div", { className: "sdk-data-table__confirm-actions", children: [_jsx("button", { type: "button", onClick: onCancel, disabled: pending, className: "sdk-data-table__confirm-cancel", children: definition.cancelLabel }), confirmButton] })] }) }));
}
function SdkTableActionButton({ action, onActionSuccess }) {
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
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : buildRequestErrorMessage(action);
            notify.error(message);
        }
        finally {
            setPending(false);
        }
    }, [action, onActionSuccess, pending]);
    if (action.kind === 'button' && action.formId && confirm) {
        return (_jsxs(React.Fragment, { children: [_jsx("button", { type: "button", title: action.title, className: action.className, disabled: action.disabled || pending, onClick: () => setConfirmOpen(true), children: content }), confirmOpen && confirm ? (_jsx(PortableConfirmDialog, { definition: confirm, pending: pending, onCancel: () => setConfirmOpen(false), confirmButton: _jsx("button", { type: "submit", form: action.formId, name: action.name, value: action.value, className: action.className, onClick: () => setConfirmOpen(false), children: confirm.confirmLabel }) })) : null] }, action.id));
    }
    if (action.kind === 'request') {
        return (_jsxs(React.Fragment, { children: [_jsx("button", { type: "button", title: action.title, className: action.className, disabled: action.disabled || pending, onClick: () => {
                        if (confirm) {
                            setConfirmOpen(true);
                            return;
                        }
                        void executeRequest();
                    }, children: content }), confirmOpen && confirm ? (_jsx(PortableConfirmDialog, { definition: confirm, pending: pending, onCancel: () => setConfirmOpen(false), confirmButton: _jsx("button", { type: "button", className: action.className, disabled: pending, onClick: () => {
                            void executeRequest();
                        }, children: pending ? 'Working...' : confirm.confirmLabel }) })) : null] }, action.id));
    }
    return (_jsx("button", { type: action.type ?? 'button', title: action.title, className: action.className, disabled: action.disabled, name: action.name, value: action.value, form: action.formId, children: content }, action.id));
}
function renderAction(action, key, onActionSuccess) {
    if (action.kind === 'custom') {
        return (_jsx(React.Fragment, { children: action.render }, action.id ?? key));
    }
    const content = renderActionContent(action);
    if (action.kind === 'link') {
        return (_jsx("a", { href: action.href, target: action.target, rel: action.rel, title: action.title, className: action.className, children: content }, action.id ?? key));
    }
    return (_jsx(SdkTableActionButton, { action: action, onActionSuccess: onActionSuccess }, action.id ?? key));
}
function renderActionGroup({ actions, content, className, onActionSuccess }) {
    if ((!actions || actions.length === 0) && !content) {
        return null;
    }
    return (_jsxs("div", { className: className, children: [actions?.map((action, index) => renderAction(action, index, onActionSuccess)), content] }));
}
function resolveSortingIndicator(direction) {
    if (direction === 'asc') {
        return '▲';
    }
    if (direction === 'desc') {
        return '▼';
    }
    return '↕';
}
function buildResolvedDefinition({ definition, data, columns, labels, className, tableClassName, emptyState, header, toolbar, pagination, query }) {
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
export function DataTable({ definition, data, columns, labels, className, tableClassName, emptyState, header, toolbar, pagination, query, onQueryChange }) {
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
    const initialQuery = normalizeBuildTableQueryState(query ?? resolvedDefinition.query, resolvedDefinition);
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
    const remoteQuery = {
        search: deferredSearch,
        filters,
        sorting,
        page,
        pageSize
    };
    const remoteQueryKey = remoteSource
        ? createBuildTableQuerySearchParams(remoteQuery, remoteSource.queryOptions).toString()
        : '';
    const [remoteState, setRemoteState] = React.useState({
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
                const result = resolveBuildTableRemoteListResult(payload, remoteSource);
                setRemoteState({
                    items: result.items,
                    totalItems: result.total,
                    page: result.page ?? remoteQuery.page ?? 1,
                    pageSize: result.pageSize ?? remoteQuery.pageSize ?? 10,
                    loading: false,
                    error: null
                });
            }
            catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Could not load table data.';
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
    const view = remoteSource
        ? {
            items: remoteState.items,
            totalItems: remoteState.totalItems,
            filteredItems: remoteState.totalItems,
            page: remoteState.page,
            pageSize: remoteState.pageSize,
            totalPages: Math.max(1, Math.ceil(remoteState.totalItems / Math.max(1, remoteState.pageSize || 1))),
            sorting,
            filters,
            search: deferredSearch,
            startRow: remoteState.totalItems > 0
                ? (remoteState.page - 1) * remoteState.pageSize + 1
                : 0,
            endRow: remoteState.totalItems > 0
                ? Math.min(remoteState.totalItems, (remoteState.page - 1) * remoteState.pageSize +
                    remoteState.items.length)
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
    const headerNode = resolvedDefinition.header ? (_jsxs("header", { className: joinClassNames('sdk-data-table__header', resolvedDefinition.header.className), children: [_jsxs("div", { className: joinClassNames('sdk-data-table__header-content', resolvedDefinition.header.contentClassName), children: [resolvedDefinition.header.title ? (_jsx("h2", { className: joinClassNames('sdk-data-table__header-title', resolvedDefinition.header.titleClassName), children: resolvedDefinition.header.title })) : null, resolvedDefinition.header.description ? (_jsx("p", { className: joinClassNames('sdk-data-table__header-description', resolvedDefinition.header.descriptionClassName), children: resolvedDefinition.header.description })) : null, resolvedDefinition.header.content] }), renderActionGroup({
                actions: resolvedDefinition.header.actions,
                className: joinClassNames('sdk-data-table__header-actions', resolvedDefinition.header.actionsClassName),
                onActionSuccess: refreshRemoteData
            })] })) : null;
    const searchNode = resolvedDefinition.toolbar?.search?.enabled === true ? (_jsx("input", { type: "search", value: search, onChange: (event) => {
            const nextValue = event.currentTarget.value;
            React.startTransition(() => {
                setSearch(nextValue);
                setPage(1);
            });
        }, placeholder: resolvedDefinition.toolbar.search.placeholder ?? 'Search...', className: joinClassNames('sdk-data-table__toolbar-search', resolvedDefinition.toolbar.search.className) })) : null;
    const filtersNode = resolvedDefinition.toolbar?.filters &&
        resolvedDefinition.toolbar.filters.length > 0 ? (_jsx("div", { className: joinClassNames('sdk-data-table__toolbar-filters', resolvedDefinition.toolbar.filtersClassName), children: resolvedDefinition.toolbar.filters.map((filter) => {
            const filterValue = filters[filter.id] ?? '';
            if (filter.kind === 'select') {
                return (_jsxs("label", { className: joinClassNames('sdk-data-table__filter', filter.className), children: [filter.label ? (_jsx("span", { className: "sdk-data-table__filter-label", children: filter.label })) : null, _jsxs("select", { value: filterValue, onChange: (event) => {
                                const nextValue = event.currentTarget.value;
                                React.startTransition(() => {
                                    setFilters((current) => ({
                                        ...current,
                                        [filter.id]: nextValue
                                    }));
                                    setPage(1);
                                });
                            }, children: [_jsx("option", { value: "", children: filter.placeholder ?? 'All' }), filter.options?.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] })] }, filter.id));
            }
            return (_jsxs("label", { className: joinClassNames('sdk-data-table__filter', filter.className), children: [filter.label ? (_jsx("span", { className: "sdk-data-table__filter-label", children: filter.label })) : null, _jsx("input", { type: "search", value: filterValue, placeholder: filter.placeholder, onChange: (event) => {
                            const nextValue = event.currentTarget.value;
                            React.startTransition(() => {
                                setFilters((current) => ({
                                    ...current,
                                    [filter.id]: nextValue
                                }));
                                setPage(1);
                            });
                        } })] }, filter.id));
        }) })) : null;
    const toolbarNode = resolvedDefinition.toolbar ||
        searchNode ||
        filtersNode ? (_jsxs("div", { className: joinClassNames('sdk-data-table__toolbar', resolvedDefinition.toolbar?.className), children: [_jsxs("div", { className: joinClassNames('sdk-data-table__toolbar-content', resolvedDefinition.toolbar?.contentClassName), children: [searchNode, filtersNode, resolvedDefinition.toolbar?.content] }), renderActionGroup({
                actions: resolvedDefinition.toolbar?.actions,
                className: joinClassNames('sdk-data-table__toolbar-actions', resolvedDefinition.toolbar?.actionsClassName),
                onActionSuccess: refreshRemoteData
            })] })) : null;
    const paginationDefinition = resolvedDefinition.pagination;
    const pageSizeOptions = paginationDefinition?.pageSizeOptions && paginationDefinition.pageSizeOptions.length > 0
        ? paginationDefinition.pageSizeOptions
        : null;
    const paginationSummaryLabel = paginationDefinition?.summaryLabel ?? 'Showing {start}-{end} of {total}';
    const paginationNode = (_jsxs("div", { className: joinClassNames('sdk-data-table__pagination', paginationDefinition?.className), children: [paginationDefinition?.showSummary !== false ? (_jsx("p", { className: joinClassNames('sdk-data-table__pagination-summary', paginationDefinition?.summaryClassName), children: formatBuildTablePaginationSummary({
                    startRow: view.startRow,
                    endRow: view.endRow,
                    totalItems: view.filteredItems,
                    label: paginationSummaryLabel
                }) })) : null, _jsxs("div", { className: joinClassNames('sdk-data-table__pagination-actions', paginationDefinition?.actionsClassName), children: [pageSizeOptions ? (_jsxs("label", { className: "sdk-data-table__pagination-page-size", children: [_jsx("span", { children: "Rows" }), _jsx("select", { value: String(pageSize), onChange: (event) => {
                                    const nextPageSize = Number.parseInt(event.currentTarget.value, 10);
                                    React.startTransition(() => {
                                        setPageSize(nextPageSize);
                                        setPage(1);
                                    });
                                }, children: pageSizeOptions.map((option) => (_jsx("option", { value: option, children: option }, option))) })] })) : null, _jsx("button", { type: "button", onClick: () => {
                            React.startTransition(() => {
                                setPage((current) => Math.max(1, current - 1));
                            });
                        }, disabled: view.page <= 1, children: paginationDefinition?.previousLabel ?? 'Previous' }), _jsxs("span", { className: "sdk-data-table__pagination-page-indicator", children: ["Page ", view.page, " of ", view.totalPages] }), _jsx("button", { type: "button", onClick: () => {
                            React.startTransition(() => {
                                setPage((current) => Math.min(view.totalPages, current + 1));
                            });
                        }, disabled: view.page >= view.totalPages, children: paginationDefinition?.nextLabel ?? 'Next' })] })] }));
    const emptyStateNode = remoteState.loading ? (_jsx("p", { children: "Loading..." })) : remoteState.error ? (_jsx("p", { children: remoteState.error })) : (resolvedDefinition.emptyState ?? (_jsx("p", { children: resolvedDefinition.labels?.empty ?? 'No records found.' })));
    if (view.items.length === 0) {
        return (_jsxs("div", { className: joinClassNames('sdk-data-table', resolvedDefinition.className), children: [headerNode, toolbarNode, _jsx("div", { className: "sdk-data-table__empty", children: emptyStateNode }), paginationNode] }));
    }
    return (_jsxs("div", { className: joinClassNames('sdk-data-table', resolvedDefinition.className), children: [headerNode, toolbarNode, _jsxs("table", { className: joinClassNames('sdk-data-table__table', resolvedDefinition.tableClassName), children: [_jsx("thead", { children: _jsx("tr", { children: resolvedDefinition.columns.map((column, index) => {
                                const columnId = String(column.key);
                                const isSorted = view.sorting?.columnId === columnId;
                                const sortDirection = isSorted ? view.sorting?.direction ?? null : null;
                                return (_jsx("th", { className: column.headerClassName, children: column.sortable ? (_jsxs("button", { type: "button", onClick: () => {
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
                                        }, className: "sdk-data-table__sort-button", children: [column.header, _jsx("span", { className: "sdk-data-table__sort-indicator", children: resolveSortingIndicator(sortDirection) })] })) : (column.header) }, `${String(column.key)}-${index}`));
                            }) }) }), _jsx("tbody", { children: view.items.map((item, rowIndex) => (_jsx("tr", { children: resolvedDefinition.columns.map((column, columnIndex) => (_jsx("td", { className: column.className, children: column.actions
                                    ? renderActionGroup({
                                        actions: typeof column.actions === 'function'
                                            ? column.actions(item)
                                            : column.actions,
                                        className: joinClassNames('sdk-data-table__cell-actions', column.actionsClassName),
                                        onActionSuccess: refreshRemoteData
                                    })
                                    : column.cell
                                        ? column.cell(item)
                                        : String(readCellValue(item, column.key) ?? '') }, `${String(column.key)}-${columnIndex}`))) }, rowIndex))) })] }), paginationNode] }));
}
