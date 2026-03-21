'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getLogTableDefinition,
  type AdminSystemLogRow
} from './log-columns';
import type { AdminLogsCopy } from './i18n';

type AdminLogsDataTableProps = {
  data: AdminSystemLogRow[];
  copy: AdminLogsCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminLogsDataTable({
  data,
  copy,
  tableTemplate
}: AdminLogsDataTableProps) {
  return (
    <DataTable
      definition={getLogTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1650px]"
    />
  );
}
