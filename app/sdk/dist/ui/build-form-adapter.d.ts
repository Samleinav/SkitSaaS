import * as React from 'react';
import type { BuildFormUiAdapter } from './build-form-contract.js';
export declare function BuildFormUiAdapterProvider({ adapter, children, }: {
    adapter: BuildFormUiAdapter | null;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useBuildFormUiAdapter(): BuildFormUiAdapter | null;
