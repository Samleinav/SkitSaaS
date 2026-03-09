'use client';

import {
  DataTable,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import type { AdminAppConfigModuleItem } from './config';
import { getModulesTableDefinition } from './columns';

export function AdminAppConfigModulesDataTable({
  data,
  messages,
  tableTemplate
}: {
  data: AdminAppConfigModuleItem[];
  messages: AdminMessages;
  tableTemplate?: DataTableThemeTemplate;
}) {
  return (
    <DataTable
      definition={getModulesTableDefinition({
        data,
        messages
      })}
      labels={messages.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[980px]"
    />
  );
}
