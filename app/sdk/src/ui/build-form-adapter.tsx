'use client';

import * as React from 'react';
import type { BuildFormUiAdapter } from './build-form-contract.js';

const BuildFormUiAdapterContext = React.createContext<BuildFormUiAdapter | null>(
  null
);

export function BuildFormUiAdapterProvider({
  adapter,
  children,
}: {
  adapter: BuildFormUiAdapter | null;
  children: React.ReactNode;
}) {
  return (
    <BuildFormUiAdapterContext.Provider value={adapter}>
      {children}
    </BuildFormUiAdapterContext.Provider>
  );
}

export function useBuildFormUiAdapter() {
  return React.useContext(BuildFormUiAdapterContext);
}
