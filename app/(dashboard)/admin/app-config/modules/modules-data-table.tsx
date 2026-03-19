'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import type { AdminAppConfigModuleItem } from './config';
import { getModulesTableDefinition } from './columns';
import type { AdminAppConfigModulesCopy } from './i18n';

export function AdminAppConfigModulesDataTable({
  data,
  copy,
  tableTemplate
}: {
  data: AdminAppConfigModuleItem[];
  copy: AdminAppConfigModulesCopy;
  tableTemplate?: DataTableThemeTemplate;
}) {
  return (
    <DataTable
      definition={getModulesTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[980px]"
    />
  );
}
