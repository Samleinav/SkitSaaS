export function resolveSdkDataTableDefinition({ definition, data, columns, labels, className, tableClassName, emptyState, header, toolbar, pagination, query, }) {
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
                        ...toolbar,
                    },
                }
                : {}),
            ...(pagination
                ? {
                    pagination: {
                        ...(definition.pagination ?? {}),
                        ...pagination,
                    },
                }
                : {}),
            ...(query
                ? {
                    query: {
                        ...(definition.query ?? {}),
                        ...query,
                    },
                }
                : {}),
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
        query,
    };
}
