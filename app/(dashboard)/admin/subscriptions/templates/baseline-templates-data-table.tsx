'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DataTable,
  type DataTableLabels,
  type DataTableThemeTemplate
} from '@/components/ui/data-table';
import {
  buildTableColumn,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
import { AdminTableSlotTemplate } from '../../table-slot-template';

export type AdminBaselineTemplateRow = {
  id: number;
  name: string;
  scope: 'organization' | 'user';
  scopeLabel: string;
  policyLabel: string;
  editHref: string;
};

type AdminBaselineTemplatesDataTableCopy = {
  headers: {
    name: string;
    scope: string;
    policy: string;
    actions: string;
  };
  edit: string;
  noResults: string;
  dataTable: DataTableLabels;
};

type AdminBaselineTemplatesDataTableProps = {
  data: AdminBaselineTemplateRow[];
  copy: AdminBaselineTemplatesDataTableCopy;
  tableTemplate?: DataTableThemeTemplate;
};

function getBaselineTemplatesTableDefinition({
  data,
  copy
}: {
  data: AdminBaselineTemplateRow[];
  copy: AdminBaselineTemplatesDataTableCopy;
}): BuildTableDefinition<AdminBaselineTemplateRow> {
  const definition: BuildTableDefinition<AdminBaselineTemplateRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminBaselineTemplateRow>({
        key: 'name',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.name"
          >
            <span>{copy.headers.name}</span>
          </AdminTableSlotTemplate>
        ),
        searchable: true,
        sortable: true,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.name"
            data={{
              templateId: row.id
            }}
          >
            <div className="min-w-[220px]">
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">#{row.id}</p>
            </div>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminBaselineTemplateRow>({
        key: 'scope',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.scope"
          >
            <span>{copy.headers.scope}</span>
          </AdminTableSlotTemplate>
        ),
        sortable: true,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.scope"
            data={{
              templateId: row.id,
              scope: row.scope
            }}
          >
            <span>{row.scopeLabel}</span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminBaselineTemplateRow>({
        key: 'policyLabel',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.policy"
          >
            <span>{copy.headers.policy}</span>
          </AdminTableSlotTemplate>
        ),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.policy"
            data={{
              templateId: row.id
            }}
          >
            <span className="text-xs text-muted-foreground">{row.policyLabel}</span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.custom<AdminBaselineTemplateRow>({
        key: 'actions',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.actions"
          >
            <span>{copy.headers.actions}</span>
          </AdminTableSlotTemplate>
        ),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.actions.edit"
            data={{
              templateId: row.id
            }}
          >
            <Button asChild size="sm" variant="outline">
              <Link href={row.editHref}>{copy.edit}</Link>
            </Button>
          </AdminTableSlotTemplate>
        )
      })
    ],
    pagination: {
      pageSize: 5
    },
    emptyState: (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        {copy.noResults}
      </div>
    )
  };

  return defineBuildTable<
    AdminBaselineTemplateRow,
    BuildTableDefinition<AdminBaselineTemplateRow>
  >(definition);
}

export function AdminBaselineTemplatesDataTable({
  data,
  copy,
  tableTemplate
}: AdminBaselineTemplatesDataTableProps) {
  return (
    <DataTable
      definition={getBaselineTemplatesTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[720px]"
    />
  );
}
