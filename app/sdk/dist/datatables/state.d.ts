import type { BuildTableDefinition, BuildTableQueryFilters, BuildTableQueryState, BuildTableSortDirection, BuildTableSortingState } from './definition.js';
export declare const DEFAULT_BUILD_TABLE_PAGE = 1;
export declare const DEFAULT_BUILD_TABLE_PAGE_SIZE = 10;
export type ResolvedBuildTableView<TItem extends Record<string, unknown>> = {
    items: TItem[];
    totalItems: number;
    filteredItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    sorting: BuildTableSortingState | null;
    filters: BuildTableQueryFilters;
    search: string;
    startRow: number;
    endRow: number;
};
export declare function normalizeBuildTablePage(value: unknown, fallback?: number): number;
export declare function normalizeBuildTablePageSize(value: unknown, fallback?: number): number;
export declare function normalizeBuildTableSortDirection(value: unknown): BuildTableSortDirection | null;
export declare function normalizeBuildTableQueryState<TItem extends Record<string, unknown>>(query: BuildTableQueryState | undefined, definition?: BuildTableDefinition<TItem>): BuildTableQueryState;
export declare function filterBuildTableData<TItem extends Record<string, unknown>>(definition: BuildTableDefinition<TItem>, query: BuildTableQueryState | undefined): TItem[];
export declare function sortBuildTableData<TItem extends Record<string, unknown>>(definition: BuildTableDefinition<TItem>, items: TItem[], sorting: BuildTableSortingState | null | undefined): TItem[];
export declare function paginateBuildTableData<TItem extends Record<string, unknown>>({ items, page, pageSize }: {
    items: TItem[];
    page: number;
    pageSize: number;
}): {
    items: TItem[];
    page: number;
    pageSize: number;
    totalPages: number;
    startRow: number;
    endRow: number;
};
export declare function formatBuildTablePaginationSummary({ startRow, endRow, totalItems, label }: {
    startRow: number;
    endRow: number;
    totalItems: number;
    label?: string;
}): string;
export declare function resolveBuildTableView<TItem extends Record<string, unknown>>(definition: BuildTableDefinition<TItem>, query?: BuildTableQueryState | undefined): ResolvedBuildTableView<TItem>;
