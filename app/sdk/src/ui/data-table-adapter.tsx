'use client';

import * as React from 'react';
import type { DataTableUiAdapter } from './data-table-contract.js';

const DataTableUiAdapterContext = React.createContext<DataTableUiAdapter | null>(
  null
);

export function DataTableUiAdapterProvider({
  adapter,
  children,
}: {
  adapter: DataTableUiAdapter | null;
  children: React.ReactNode;
}) {
  return (
    <DataTableUiAdapterContext.Provider value={adapter}>
      {children}
    </DataTableUiAdapterContext.Provider>
  );
}

export function useDataTableUiAdapter() {
  return React.useContext(DataTableUiAdapterContext);
}
