export function defineBuildTable(definition) {
    return definition;
}
export function composeBuildTableDefinition(definition, options) {
    return {
        ...definition,
        ...options,
        data: options.data ?? definition.data,
        columns: options.columns ?? definition.columns,
        labels: options.labels
            ? {
                ...(definition.labels ?? {}),
                ...options.labels
            }
            : definition.labels,
        header: options.header
            ? {
                ...(definition.header ?? {}),
                ...options.header
            }
            : definition.header,
        toolbar: options.toolbar
            ? {
                ...(definition.toolbar ?? {}),
                ...options.toolbar
            }
            : definition.toolbar,
        pagination: options.pagination
            ? {
                ...(definition.pagination ?? {}),
                ...options.pagination
            }
            : definition.pagination,
        query: options.query
            ? {
                ...(definition.query ?? {}),
                ...options.query
            }
            : definition.query,
        source: options.source
            ? {
                ...(definition.source ?? {}),
                ...options.source
            }
            : definition.source
    };
}
export function withBuildTableData(definition, data) {
    return composeBuildTableDefinition(definition, {
        data
    });
}
export function withBuildTableQuery(definition, query) {
    return composeBuildTableDefinition(definition, {
        query
    });
}
export const buildTableColumn = {
    text(column) {
        return column;
    },
    actions(column) {
        return column;
    },
    custom(column) {
        return column;
    }
};
export const buildTableFilter = {
    text(filter) {
        return {
            kind: 'text',
            ...filter
        };
    },
    select(filter) {
        return {
            kind: 'select',
            ...filter
        };
    }
};
export const buildTableAction = {
    link(action) {
        return {
            kind: 'link',
            ...action
        };
    },
    button(action) {
        return {
            kind: 'button',
            type: 'button',
            ...action
        };
    },
    request(action) {
        return {
            kind: 'request',
            ...action
        };
    },
    custom(action) {
        return {
            kind: 'custom',
            ...action
        };
    }
};
