export const DEFAULT_BUILD_TABLE_PAGE = 1;
export const DEFAULT_BUILD_TABLE_PAGE_SIZE = 10;
function readItemValue(item, key) {
    if (typeof key !== 'string') {
        return item[key];
    }
    return item[key];
}
function normalizeStringValue(value) {
    if (value == null) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return String(value).trim();
}
function normalizeSearchValue(value) {
    return normalizeStringValue(value).toLowerCase();
}
function resolveColumnValue({ item, column }) {
    if (column.filterValue) {
        return column.filterValue(item);
    }
    return readItemValue(item, column.key);
}
function resolveSortValue({ item, column }) {
    if (column.sortValue) {
        return column.sortValue(item);
    }
    return resolveColumnValue({
        item,
        column
    });
}
function compareBuildTableValues(left, right) {
    if (left == null && right == null) {
        return 0;
    }
    if (left == null) {
        return -1;
    }
    if (right == null) {
        return 1;
    }
    if (left instanceof Date || right instanceof Date) {
        const leftTime = left instanceof Date
            ? left.getTime()
            : typeof left === 'string' || typeof left === 'number'
                ? new Date(left).getTime()
                : Number.NaN;
        const rightTime = right instanceof Date
            ? right.getTime()
            : typeof right === 'string' || typeof right === 'number'
                ? new Date(right).getTime()
                : Number.NaN;
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
            return leftTime - rightTime;
        }
        return String(left).localeCompare(String(right), undefined, {
            numeric: true,
            sensitivity: 'base'
        });
    }
    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }
    return String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base'
    });
}
function findColumnById(definition, columnId) {
    return (definition.columns.find((column) => String(column.key) === columnId) ?? null);
}
function resolveFilterValue({ item, filter, definition }) {
    if (filter.getValue) {
        return filter.getValue(item);
    }
    if (filter.column != null) {
        const column = findColumnById(definition, String(filter.column));
        if (column) {
            return resolveColumnValue({
                item,
                column
            });
        }
        return readItemValue(item, filter.column);
    }
    return undefined;
}
function normalizeFilterValue(value) {
    const normalized = normalizeStringValue(value);
    return normalized.length > 0 ? normalized : '';
}
function resolveDefaultFilters(definition) {
    const filters = definition.toolbar?.filters ?? [];
    return filters.reduce((accumulator, filter) => {
        const normalized = normalizeFilterValue(filter.defaultValue);
        if (normalized) {
            accumulator[filter.id] = normalized;
        }
        return accumulator;
    }, {});
}
function resolvePageSize(pagination, query) {
    return normalizeBuildTablePageSize(query?.pageSize, pagination?.pageSize ?? DEFAULT_BUILD_TABLE_PAGE_SIZE);
}
export function normalizeBuildTablePage(value, fallback = 1) {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
export function normalizeBuildTablePageSize(value, fallback = 10) {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
export function normalizeBuildTableSortDirection(value) {
    return value === 'asc' || value === 'desc' ? value : null;
}
export function normalizeBuildTableQueryState(query, definition) {
    const pageSize = resolvePageSize(definition?.pagination, query);
    const defaultFilters = definition ? resolveDefaultFilters(definition) : {};
    const normalizedFilters = {
        ...defaultFilters,
        ...Object.fromEntries(Object.entries(query?.filters ?? {}).flatMap(([key, value]) => {
            const normalizedValue = normalizeFilterValue(value);
            return normalizedValue ? [[key, normalizedValue]] : [];
        }))
    };
    const search = normalizeFilterValue(query?.search);
    const sorting = query?.sorting &&
        normalizeBuildTableSortDirection(query.sorting.direction) &&
        normalizeStringValue(query.sorting.columnId)
        ? {
            columnId: normalizeStringValue(query.sorting.columnId),
            direction: normalizeBuildTableSortDirection(query.sorting.direction)
        }
        : null;
    return {
        search,
        sorting,
        filters: normalizedFilters,
        page: normalizeBuildTablePage(query?.page, definition?.query?.page ?? DEFAULT_BUILD_TABLE_PAGE),
        pageSize
    };
}
export function filterBuildTableData(definition, query) {
    const normalized = normalizeBuildTableQueryState(query, definition);
    const searchValue = normalizeSearchValue(normalized.search);
    const toolbarFilters = definition.toolbar?.filters ?? [];
    const searchColumns = definition.toolbar?.search?.columns?.map((column) => String(column)) ?? null;
    return definition.data.filter((item) => {
        const matchesSearch = searchValue
            ? definition.columns.some((column) => {
                if (column.searchable === false) {
                    return false;
                }
                if (Array.isArray(searchColumns) &&
                    searchColumns.length > 0 &&
                    !searchColumns.includes(String(column.key))) {
                    return false;
                }
                return normalizeSearchValue(resolveColumnValue({
                    item,
                    column
                })).includes(searchValue);
            })
            : true;
        if (!matchesSearch) {
            return false;
        }
        return toolbarFilters.every((filter) => {
            const filterQueryValue = normalized.filters?.[filter.id];
            if (!filterQueryValue) {
                return true;
            }
            const itemValue = normalizeSearchValue(resolveFilterValue({
                item,
                filter,
                definition
            }));
            const expectedValue = normalizeSearchValue(filterQueryValue);
            if (filter.kind === 'select') {
                return itemValue === expectedValue;
            }
            return itemValue.includes(expectedValue);
        });
    });
}
export function sortBuildTableData(definition, items, sorting) {
    if (!sorting) {
        return items;
    }
    const column = findColumnById(definition, sorting.columnId);
    if (!column || column.sortable !== true) {
        return items;
    }
    const directionMultiplier = sorting.direction === 'desc' ? -1 : 1;
    return [...items].sort((left, right) => {
        return (compareBuildTableValues(resolveSortValue({
            item: left,
            column
        }), resolveSortValue({
            item: right,
            column
        })) * directionMultiplier);
    });
}
export function paginateBuildTableData({ items, page, pageSize }) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const resolvedPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (resolvedPage - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);
    const startRow = paginatedItems.length > 0 ? startIndex + 1 : 0;
    const endRow = paginatedItems.length > 0 ? startIndex + paginatedItems.length : 0;
    return {
        items: paginatedItems,
        page: resolvedPage,
        pageSize,
        totalPages,
        startRow,
        endRow
    };
}
export function formatBuildTablePaginationSummary({ startRow, endRow, totalItems, label = 'Showing {start}-{end} of {total}' }) {
    return label
        .replace('{start}', String(startRow))
        .replace('{end}', String(endRow))
        .replace('{total}', String(totalItems));
}
export function resolveBuildTableView(definition, query = definition.query) {
    const normalizedQuery = normalizeBuildTableQueryState(query, definition);
    const filteredItems = filterBuildTableData(definition, normalizedQuery);
    const sortedItems = sortBuildTableData(definition, filteredItems, normalizedQuery.sorting);
    const paginated = paginateBuildTableData({
        items: sortedItems,
        page: normalizedQuery.page ?? DEFAULT_BUILD_TABLE_PAGE,
        pageSize: normalizedQuery.pageSize ?? DEFAULT_BUILD_TABLE_PAGE_SIZE
    });
    return {
        items: paginated.items,
        totalItems: definition.data.length,
        filteredItems: sortedItems.length,
        page: paginated.page,
        pageSize: paginated.pageSize,
        totalPages: paginated.totalPages,
        sorting: normalizedQuery.sorting ?? null,
        filters: normalizedQuery.filters ?? {},
        search: normalizedQuery.search ?? '',
        startRow: paginated.startRow,
        endRow: paginated.endRow
    };
}
