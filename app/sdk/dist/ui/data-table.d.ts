import * as React from 'react';
export type SdkDataTableLabels = {
    empty?: string;
};
export type SdkDataTableColumn<TItem extends Record<string, unknown>> = {
    key: keyof TItem | string;
    header: React.ReactNode;
    cell?: (item: TItem) => React.ReactNode;
    className?: string;
    headerClassName?: string;
};
export type DataTableProps<TItem extends Record<string, unknown>> = {
    data: TItem[];
    columns: SdkDataTableColumn<TItem>[];
    labels?: SdkDataTableLabels;
    className?: string;
    emptyState?: React.ReactNode;
};
export declare function DataTable<TItem extends Record<string, unknown>>({ data, columns, labels, className, emptyState }: DataTableProps<TItem>): import("react/jsx-runtime").JSX.Element;
