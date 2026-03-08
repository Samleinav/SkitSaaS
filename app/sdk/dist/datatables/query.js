function resolveQueryOptionDefaults(options = {}) {
    return {
        searchKey: options.searchKey ?? 'search',
        sortKey: options.sortKey ?? 'sort',
        directionKey: options.directionKey ?? 'dir',
        pageKey: options.pageKey ?? 'page',
        pageSizeKey: options.pageSizeKey ?? 'pageSize',
        filterPrefix: options.filterPrefix ?? 'filter.'
    };
}
function toUrlSearchParams(input) {
    if (input instanceof URLSearchParams) {
        return input;
    }
    if (typeof input === 'string') {
        return new URLSearchParams(input);
    }
    return new URLSearchParams();
}
export function parseBuildTableQueryState(input, options = {}) {
    const params = toUrlSearchParams(input);
    const keys = resolveQueryOptionDefaults(options);
    const filters = Array.from(params.entries()).reduce((accumulator, [key, value]) => {
        if (!key.startsWith(keys.filterPrefix)) {
            return accumulator;
        }
        const filterId = key.slice(keys.filterPrefix.length).trim();
        if (!filterId || !value.trim()) {
            return accumulator;
        }
        accumulator[filterId] = value.trim();
        return accumulator;
    }, {});
    const search = params.get(keys.searchKey)?.trim() ?? '';
    const sortColumnId = params.get(keys.sortKey)?.trim() ?? '';
    const sortDirection = params.get(keys.directionKey)?.trim() ?? '';
    const page = Number.parseInt(params.get(keys.pageKey) ?? '', 10);
    const pageSize = Number.parseInt(params.get(keys.pageSizeKey) ?? '', 10);
    return {
        ...(search ? { search } : {}),
        ...(sortColumnId && (sortDirection === 'asc' || sortDirection === 'desc')
            ? {
                sorting: {
                    columnId: sortColumnId,
                    direction: sortDirection
                }
            }
            : {}),
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
        ...(Number.isInteger(page) && page > 0 ? { page } : {}),
        ...(Number.isInteger(pageSize) && pageSize > 0 ? { pageSize } : {})
    };
}
export function createBuildTableQuerySearchParams(query, options = {}) {
    const keys = resolveQueryOptionDefaults(options);
    const params = new URLSearchParams();
    if (query.search?.trim()) {
        params.set(keys.searchKey, query.search.trim());
    }
    if (query.sorting?.columnId && query.sorting.direction) {
        params.set(keys.sortKey, query.sorting.columnId);
        params.set(keys.directionKey, query.sorting.direction);
    }
    if (typeof query.page === 'number' && Number.isInteger(query.page) && query.page > 0) {
        params.set(keys.pageKey, String(query.page));
    }
    if (typeof query.pageSize === 'number' &&
        Number.isInteger(query.pageSize) &&
        query.pageSize > 0) {
        params.set(keys.pageSizeKey, String(query.pageSize));
    }
    for (const [filterId, value] of Object.entries(query.filters ?? {})) {
        const normalizedId = filterId.trim();
        const normalizedValue = value.trim();
        if (!normalizedId || !normalizedValue) {
            continue;
        }
        params.set(`${keys.filterPrefix}${normalizedId}`, normalizedValue);
    }
    return params;
}
