'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
const BuildFormUiAdapterContext = React.createContext(null);
export function BuildFormUiAdapterProvider({ adapter, children, }) {
    return (_jsx(BuildFormUiAdapterContext.Provider, { value: adapter, children: children }));
}
export function useBuildFormUiAdapter() {
    return React.useContext(BuildFormUiAdapterContext);
}
