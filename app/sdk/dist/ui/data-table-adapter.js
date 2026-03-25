'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
const DataTableUiAdapterContext = React.createContext(null);
export function DataTableUiAdapterProvider({ adapter, children, }) {
    return (_jsx(DataTableUiAdapterContext.Provider, { value: adapter, children: children }));
}
export function useDataTableUiAdapter() {
    return React.useContext(DataTableUiAdapterContext);
}
