import * as React from 'react';
export type BuildTableLabels = {
    empty?: string;
};
export type BuildTableValue = string | number | boolean | Date | null | undefined;
export type BuildTableColumnKey<TItem extends Record<string, unknown>> = keyof TItem | string;
export type BuildTableActionButtonType = 'button' | 'submit' | 'reset';
export type BuildTableRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type BuildTableRequestBodyFormat = 'json' | 'formData' | 'searchParams';
export type BuildTableSortDirection = 'asc' | 'desc';
export type BuildTableFilterKind = 'text' | 'select';
export type BuildTableQueryParamOptions = {
    searchKey?: string;
    sortKey?: string;
    directionKey?: string;
    pageKey?: string;
    pageSizeKey?: string;
    filterPrefix?: string;
};
export type BuildTableSortingState = {
    columnId: string;
    direction: BuildTableSortDirection;
};
export type BuildTableQueryFilters = Record<string, string>;
export type BuildTableQueryState = {
    search?: string;
    sorting?: BuildTableSortingState | null;
    filters?: BuildTableQueryFilters;
    page?: number;
    pageSize?: number;
};
type BaseBuildTableActionDefinition = {
    id?: string;
    label?: React.ReactNode;
    title?: string;
    className?: string;
    leadingVisual?: React.ReactNode;
    trailingVisual?: React.ReactNode;
};
export type BuildTableConfirmDefinition = {
    title: React.ReactNode;
    description?: React.ReactNode;
    confirmLabel: React.ReactNode;
    cancelLabel: React.ReactNode;
};
export type BuildTableRequestDefinition = {
    url: string;
    method?: BuildTableRequestMethod;
    body?: Record<string, unknown>;
    bodyFormat?: BuildTableRequestBodyFormat;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    reload?: boolean;
    successMessage?: string;
    errorMessage?: string;
};
export type BuildTableLinkActionDefinition = BaseBuildTableActionDefinition & {
    kind: 'link';
    href: string;
    target?: string;
    rel?: string;
};
export type BuildTableButtonActionDefinition = BaseBuildTableActionDefinition & {
    kind: 'button';
    type?: BuildTableActionButtonType;
    disabled?: boolean;
    name?: string;
    value?: string;
    formId?: string;
    confirm?: BuildTableConfirmDefinition;
};
export type BuildTableRequestActionDefinition = BaseBuildTableActionDefinition & {
    kind: 'request';
    disabled?: boolean;
    request: BuildTableRequestDefinition;
    confirm?: BuildTableConfirmDefinition;
};
export type BuildTableCustomActionDefinition = {
    id?: string;
    kind: 'custom';
    render: React.ReactNode;
    className?: string;
};
export type BuildTableActionDefinition = BuildTableLinkActionDefinition | BuildTableButtonActionDefinition | BuildTableRequestActionDefinition | BuildTableCustomActionDefinition;
export type BuildTableFilterOption = {
    value: string;
    label: React.ReactNode;
};
export type BuildTableFilterDefinition<TItem extends Record<string, unknown>> = {
    id: string;
    kind?: BuildTableFilterKind;
    label?: React.ReactNode;
    placeholder?: string;
    column?: BuildTableColumnKey<TItem>;
    options?: BuildTableFilterOption[];
    getValue?: (item: TItem) => BuildTableValue;
    defaultValue?: string;
    className?: string;
};
export type BuildTableToolbarSearchDefinition<TItem extends Record<string, unknown>> = {
    enabled?: boolean;
    placeholder?: string;
    columns?: Array<BuildTableColumnKey<TItem>>;
    className?: string;
};
export type BuildTableColumn<TItem extends Record<string, unknown>> = {
    key: BuildTableColumnKey<TItem>;
    header: React.ReactNode;
    cell?: (item: TItem) => React.ReactNode;
    actions?: BuildTableActionDefinition[] | ((item: TItem) => BuildTableActionDefinition[]);
    actionsClassName?: string;
    className?: string;
    headerClassName?: string;
    sortable?: boolean;
    searchable?: boolean;
    sortValue?: (item: TItem) => BuildTableValue;
    filterValue?: (item: TItem) => BuildTableValue;
};
export type BuildTableHeaderDefinition = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: BuildTableActionDefinition[];
    content?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    actionsClassName?: string;
};
export type BuildTableToolbarDefinition<TItem extends Record<string, unknown>> = {
    actions?: BuildTableActionDefinition[];
    content?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    actionsClassName?: string;
    search?: BuildTableToolbarSearchDefinition<TItem>;
    filters?: BuildTableFilterDefinition<TItem>[];
    filtersClassName?: string;
};
export type BuildTablePaginationDefinition = {
    pageSize?: number;
    pageSizeOptions?: number[];
    previousLabel?: React.ReactNode;
    nextLabel?: React.ReactNode;
    summaryLabel?: string;
    showSummary?: boolean;
    className?: string;
    summaryClassName?: string;
    actionsClassName?: string;
};
export type BuildTableRemoteSourceResponseDefinition = {
    itemsKey?: string;
    totalKey?: string;
    pageKey?: string;
    pageSizeKey?: string;
};
export type BuildTableRemoteSourceDefinition = {
    url: string;
    queryOptions?: BuildTableQueryParamOptions;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    debounceMs?: number;
    response?: BuildTableRemoteSourceResponseDefinition;
};
export type BuildTableDefinition<TItem extends Record<string, unknown>> = {
    id?: string;
    data: TItem[];
    columns: BuildTableColumn<TItem>[];
    labels?: BuildTableLabels;
    className?: string;
    tableClassName?: string;
    emptyState?: React.ReactNode;
    header?: BuildTableHeaderDefinition;
    toolbar?: BuildTableToolbarDefinition<TItem>;
    pagination?: BuildTablePaginationDefinition;
    query?: BuildTableQueryState;
    source?: BuildTableRemoteSourceDefinition;
};
export type ComposeBuildTableDefinitionOptions<TItem extends Record<string, unknown>> = Partial<BuildTableDefinition<TItem>>;
export type ComposedBuildTableDefinition<TItem extends Record<string, unknown>, TDefinition extends BuildTableDefinition<TItem> = BuildTableDefinition<TItem>> = TDefinition & Pick<BuildTableDefinition<TItem>, 'data' | 'columns' | 'labels' | 'className' | 'tableClassName' | 'emptyState' | 'header' | 'toolbar' | 'pagination' | 'query' | 'source'>;
export declare function defineBuildTable<TItem extends Record<string, unknown>, TDefinition extends BuildTableDefinition<TItem>>(definition: TDefinition): TDefinition;
export declare function composeBuildTableDefinition<TItem extends Record<string, unknown>, TDefinition extends BuildTableDefinition<TItem>>(definition: TDefinition, options: ComposeBuildTableDefinitionOptions<TItem>): ComposedBuildTableDefinition<TItem, TDefinition>;
export declare function withBuildTableData<TItem extends Record<string, unknown>, TDefinition extends BuildTableDefinition<TItem>>(definition: TDefinition, data: TItem[]): ComposedBuildTableDefinition<TItem, TDefinition>;
export declare function withBuildTableQuery<TItem extends Record<string, unknown>, TDefinition extends BuildTableDefinition<TItem>>(definition: TDefinition, query: BuildTableQueryState): ComposedBuildTableDefinition<TItem, TDefinition>;
export declare const buildTableColumn: {
    text<TItem extends Record<string, unknown>>(column: BuildTableColumn<TItem>): BuildTableColumn<TItem>;
    actions<TItem extends Record<string, unknown>>(column: BuildTableColumn<TItem>): BuildTableColumn<TItem>;
    custom<TItem extends Record<string, unknown>>(column: BuildTableColumn<TItem>): BuildTableColumn<TItem>;
};
export declare const buildTableFilter: {
    text<TItem extends Record<string, unknown>>(filter: BuildTableFilterDefinition<TItem>): {
        id: string;
        kind: BuildTableFilterKind;
        label?: React.ReactNode;
        placeholder?: string;
        column?: BuildTableColumnKey<TItem> | undefined;
        options?: BuildTableFilterOption[];
        getValue?: ((item: TItem) => BuildTableValue) | undefined;
        defaultValue?: string;
        className?: string;
    };
    select<TItem extends Record<string, unknown>>(filter: BuildTableFilterDefinition<TItem>): {
        id: string;
        kind: BuildTableFilterKind;
        label?: React.ReactNode;
        placeholder?: string;
        column?: BuildTableColumnKey<TItem> | undefined;
        options?: BuildTableFilterOption[];
        getValue?: ((item: TItem) => BuildTableValue) | undefined;
        defaultValue?: string;
        className?: string;
    };
};
export declare const buildTableAction: {
    link(action: Omit<BuildTableLinkActionDefinition, "kind">): BuildTableLinkActionDefinition;
    button(action: Omit<BuildTableButtonActionDefinition, "kind">): BuildTableButtonActionDefinition;
    request(action: Omit<BuildTableRequestActionDefinition, "kind">): BuildTableRequestActionDefinition;
    custom(action: Omit<BuildTableCustomActionDefinition, "kind">): BuildTableCustomActionDefinition;
};
export {};
