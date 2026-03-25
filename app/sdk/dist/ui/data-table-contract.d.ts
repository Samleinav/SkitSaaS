import type { ReactNode } from 'react';
import type { BuildTableColumn, BuildTableDefinition, BuildTableHeaderDefinition, BuildTableLabels, BuildTablePaginationDefinition, BuildTableQueryState, BuildTableToolbarDefinition } from '../datatables/definition.js';
export type SdkDataTableLabels = BuildTableLabels;
export type SdkDataTableColumn<TItem extends Record<string, unknown>> = BuildTableColumn<TItem>;
export type SdkDataTableProps<TItem extends Record<string, unknown>> = {
    definition?: BuildTableDefinition<TItem>;
    data?: TItem[];
    columns?: SdkDataTableColumn<TItem>[];
    labels?: SdkDataTableLabels;
    className?: string;
    tableClassName?: string;
    emptyState?: ReactNode;
    header?: BuildTableHeaderDefinition;
    toolbar?: BuildTableToolbarDefinition<TItem>;
    pagination?: BuildTablePaginationDefinition;
    query?: BuildTableQueryState;
    onQueryChange?: (query: BuildTableQueryState) => void;
};
export type DataTableUiAdapter = {
    renderDataTable?: <TItem extends Record<string, unknown>>(props: SdkDataTableProps<TItem>) => ReactNode;
};
export declare function resolveSdkDataTableDefinition<TItem extends Record<string, unknown>>({ definition, data, columns, labels, className, tableClassName, emptyState, header, toolbar, pagination, query, }: Omit<SdkDataTableProps<TItem>, 'onQueryChange'>): BuildTableDefinition<TItem>;
