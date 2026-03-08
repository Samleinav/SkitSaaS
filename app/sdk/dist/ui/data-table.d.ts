import * as React from 'react';
import type { BuildTableColumn, BuildTableDefinition, BuildTableHeaderDefinition, BuildTableLabels, BuildTablePaginationDefinition, BuildTableQueryState, BuildTableToolbarDefinition } from '../datatables/definition.js';
export type SdkDataTableLabels = BuildTableLabels;
export type SdkDataTableColumn<TItem extends Record<string, unknown>> = BuildTableColumn<TItem>;
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
export declare function DataTable<TItem extends Record<string, unknown>>({ definition, data, columns, labels, className, tableClassName, emptyState, header, toolbar, pagination, query, onQueryChange }: DataTableProps<TItem>): import("react/jsx-runtime").JSX.Element;
