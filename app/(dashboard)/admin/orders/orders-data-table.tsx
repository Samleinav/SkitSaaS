'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import { getOrderTableDefinition, type AdminOrderRow } from './order-columns';
import type { AdminOrdersCopy } from './i18n';

type AdminOrdersDataTableProps = {
  data: AdminOrderRow[];
  copy: AdminOrdersCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminOrdersDataTable({
  data,
  copy,
  tableTemplate
}: AdminOrdersDataTableProps) {
  return (
    <DataTable
      definition={getOrderTableDefinition({ data, copy })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1940px]"
    />
  );
}
