'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getCheckoutLogTableDefinition,
  type AdminCheckoutLogRow
} from './checkout-log-columns';
import type { AdminLogsCopy } from './i18n';

type AdminCheckoutLogsDataTableProps = {
  data: AdminCheckoutLogRow[];
  copy: AdminLogsCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminCheckoutLogsDataTable({
  data,
  copy,
  tableTemplate
}: AdminCheckoutLogsDataTableProps) {
  return (
    <DataTable
      definition={getCheckoutLogTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1700px]"
    />
  );
}
