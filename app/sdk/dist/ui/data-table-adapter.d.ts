import * as React from 'react';
import type { DataTableUiAdapter } from './data-table-contract.js';
export declare function DataTableUiAdapterProvider({ adapter, children, }: {
    adapter: DataTableUiAdapter | null;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useDataTableUiAdapter(): DataTableUiAdapter | null;
