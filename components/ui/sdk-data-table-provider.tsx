'use client';

import {
  DataTableUiAdapterProvider,
  type DataTableUiAdapter,
  type SdkDataTableProps,
  resolveSdkDataTableDefinition,
} from '@skitsaas/sdk';
import type { ReactNode } from 'react';
import { DataTable as HostDataTable } from '@/components/ui/data-table';

const dataTableUiAdapter: DataTableUiAdapter = {
  renderDataTable<TItem extends Record<string, unknown>>(
    props: SdkDataTableProps<TItem>
  ) {
    return (
      <HostDataTable
        definition={resolveSdkDataTableDefinition(props)}
        onQueryChange={props.onQueryChange}
      />
    );
  },
};

export function SdkDataTableProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DataTableUiAdapterProvider adapter={dataTableUiAdapter}>
      {children}
    </DataTableUiAdapterProvider>
  );
}
