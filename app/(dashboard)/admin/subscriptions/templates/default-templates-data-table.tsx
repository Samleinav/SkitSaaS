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

export type AdminDefaultTemplateRow = {
  id: number;
  name: string;
  scope: 'organization' | 'user';
  scopeLabel: string;
  statusLabel: string;
  priceLabel: string;
  visibilityLabel: string;
  fallbackLabel: string;
  editHref: string;
};

type AdminDefaultTemplatesDataTableCopy = {
  headers: {
    name: string;
    scope: string;
    status: string;
    price: string;
    visibility: string;
    fallback: string;
    actions: string;
  };
  edit: string;
  noResults: string;
  dataTable: DataTableLabels;
};

type AdminDefaultTemplatesDataTableProps = {
  data: AdminDefaultTemplateRow[];
  copy: AdminDefaultTemplatesDataTableCopy;
  tableTemplate?: DataTableThemeTemplate;
};

function getDefaultTemplatesTableDefinition({
  data,
  copy
}: {
  data: AdminDefaultTemplateRow[];
  copy: AdminDefaultTemplatesDataTableCopy;
}): BuildTableDefinition<AdminDefaultTemplateRow> {
  const definition: BuildTableDefinition<AdminDefaultTemplateRow> = {
    data,
    columns: [
      buildTableColumn.text<AdminDefaultTemplateRow>({
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
      buildTableColumn.text<AdminDefaultTemplateRow>({
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
      buildTableColumn.text<AdminDefaultTemplateRow>({
        key: 'statusLabel',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.status"
          >
            <span>{copy.headers.status}</span>
          </AdminTableSlotTemplate>
        ),
        sortable: true,
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.status"
            data={{
              templateId: row.id
            }}
          >
            <span className="text-xs text-muted-foreground">{row.statusLabel}</span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminDefaultTemplateRow>({
        key: 'priceLabel',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.price"
          >
            <span>{copy.headers.price}</span>
          </AdminTableSlotTemplate>
        ),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.price"
            data={{
              templateId: row.id
            }}
          >
            <span className="text-xs text-muted-foreground">{row.priceLabel}</span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminDefaultTemplateRow>({
        key: 'visibilityLabel',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.visibility"
          >
            <span>{copy.headers.visibility}</span>
          </AdminTableSlotTemplate>
        ),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.visibility"
            data={{
              templateId: row.id
            }}
          >
            <span className="text-xs text-muted-foreground">
              {row.visibilityLabel}
            </span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.text<AdminDefaultTemplateRow>({
        key: 'fallbackLabel',
        header: (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="header.fallback"
          >
            <span>{copy.headers.fallback}</span>
          </AdminTableSlotTemplate>
        ),
        cell: (row) => (
          <AdminTableSlotTemplate
            templateId="section.admin.table.subscriptions.templates.cell"
            slot="cell.fallback"
            data={{
              templateId: row.id
            }}
          >
            <span className="text-xs text-muted-foreground">{row.fallbackLabel}</span>
          </AdminTableSlotTemplate>
        )
      }),
      buildTableColumn.custom<AdminDefaultTemplateRow>({
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
    AdminDefaultTemplateRow,
    BuildTableDefinition<AdminDefaultTemplateRow>
  >(definition);
}

export function AdminDefaultTemplatesDataTable({
  data,
  copy,
  tableTemplate
}: AdminDefaultTemplatesDataTableProps) {
  return (
    <DataTable
      definition={getDefaultTemplatesTableDefinition({
        data,
        copy
      })}
      labels={copy.dataTable}
      template={tableTemplate}
      tableClassName="min-w-[920px]"
    />
  );
}
