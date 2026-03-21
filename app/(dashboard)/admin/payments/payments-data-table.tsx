'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  getPaymentTableDefinition,
  type AdminPaymentDataRow
} from './payment-data-columns';
import type { AdminPaymentsCopy } from './i18n';

type AdminPaymentsDataTableProps = {
  data: AdminPaymentDataRow[];
  copy: AdminPaymentsCopy;
  tableTemplate?: DataTableThemeTemplate;
};

export function AdminPaymentsDataTable({
  data,
  copy,
  tableTemplate
}: AdminPaymentsDataTableProps) {
  return (
    <DataTable
      definition={getPaymentTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[1560px]"
    />
  );
}
