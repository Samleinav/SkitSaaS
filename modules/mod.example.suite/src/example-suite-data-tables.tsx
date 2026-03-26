'use client';

import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_API_BASE,
  EXAMPLE_SUITE_DASHBOARD_ALIAS,
} from './constants';

export type ExampleSuiteAdminTableRow = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: number;
  visibilityLabel: string;
  ownerLabel: string;
  updatedAt: number;
  updatedAtLabel: string;
};

export type ExampleSuiteDashboardTableRow = {
  id: number;
  title: string;
  status: string;
  priority: number;
  visibilityLabel: string;
  canOpenDetail?: boolean;
  updatedAt: number;
  updatedAtLabel: string;
};

function ExampleSuiteStatusPill({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  const tone =
    normalized === 'active'
      ? 'emerald'
      : normalized === 'archived'
        ? 'slate'
        : 'amber';

  return (
    <span className={`example-suite-status-pill example-suite-status-pill--${tone}`}>
      {normalized}
    </span>
  );
}

function buildAdminItemsTableDefinition(items: ExampleSuiteAdminTableRow[]) {
  return defineBuildTable<ExampleSuiteAdminTableRow, any>({
    data: items,
    header: {
      title: 'Remote items table',
      description:
        'Reads from module API with source.url so authors can inspect search, filters and row actions.',
    },
    columns: [
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'id',
        header: 'Id',
        sortable: true,
        cell: (row) => <code>{row.id}</code>,
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'title',
        header: 'Title',
        sortable: true,
        searchable: true,
        cell: (row) => <strong>{row.title}</strong>,
      }),
      buildTableColumn.custom<ExampleSuiteAdminTableRow>({
        key: 'status',
        header: 'Status',
        cell: (row) => <ExampleSuiteStatusPill value={row.status} />,
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'priority',
        header: 'Priority',
        sortable: true,
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'visibilityLabel',
        header: 'Visibility',
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'ownerLabel',
        header: 'Owner',
        searchable: true,
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (row) => <code>{row.updatedAtLabel}</code>,
      }),
      buildTableColumn.actions<ExampleSuiteAdminTableRow>({
        key: 'actions',
        header: 'Actions',
        actions: (row) => [
          buildTableAction.link({
            label: 'Edit',
            href: `${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${row.id}`,
          }),
          buildTableAction.request({
            label: 'Delete',
            request: {
              url: `${EXAMPLE_SUITE_API_BASE}/items/${row.id}`,
              method: 'DELETE',
              reload: true,
              successMessage: 'Record deleted.',
            },
            confirm: {
              title: 'Delete record?',
              description: `This removes "${row.title}".`,
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel',
            },
          }),
        ],
      }),
    ],
    source: {
      url: `${EXAMPLE_SUITE_API_BASE}/items?scope=admin`,
      debounceMs: 250,
    },
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search titles or owners',
        columns: ['title', 'ownerLabel'],
      },
      filters: [
        buildTableFilter.select<ExampleSuiteAdminTableRow>({
          id: 'status',
          label: 'Status',
          column: 'status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ],
        }),
      ],
    },
    pagination: {
      pageSize: 10,
      pageSizeOptions: [10, 25, 50],
    },
  });
}

function buildDashboardItemsTableDefinition(items: ExampleSuiteDashboardTableRow[]) {
  return defineBuildTable<ExampleSuiteDashboardTableRow, any>({
    data: items,
    header: {
      title: 'Local dashboard table',
      description:
        'Uses the same SDK table contract without source.url so both patterns are visible in one module.',
    },
    columns: [
      buildTableColumn.text<ExampleSuiteDashboardTableRow>({
        key: 'id',
        header: 'Id',
        sortable: true,
        cell: (row) => <code>{row.id}</code>,
      }),
      buildTableColumn.text<ExampleSuiteDashboardTableRow>({
        key: 'title',
        header: 'Title',
        sortable: true,
        searchable: true,
        cell: (row) => (
          row.canOpenDetail ? (
            <a href={`${EXAMPLE_SUITE_DASHBOARD_ALIAS}/items/${row.id}`}>{row.title}</a>
          ) : (
            <strong>{row.title}</strong>
          )
        ),
      }),
      buildTableColumn.custom<ExampleSuiteDashboardTableRow>({
        key: 'status',
        header: 'Status',
        cell: (row) => <ExampleSuiteStatusPill value={row.status} />,
      }),
      buildTableColumn.text<ExampleSuiteDashboardTableRow>({
        key: 'priority',
        header: 'Priority',
        sortable: true,
      }),
      buildTableColumn.text<ExampleSuiteDashboardTableRow>({
        key: 'visibilityLabel',
        header: 'Visibility',
      }),
      buildTableColumn.text<ExampleSuiteDashboardTableRow>({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (row) => <code>{row.updatedAtLabel}</code>,
      }),
      buildTableColumn.actions<ExampleSuiteDashboardTableRow>({
        key: 'actions',
        header: 'Actions',
        actions: (row) =>
          row.canOpenDetail
            ? [
                buildTableAction.link({
                  label: 'View',
                  href: `${EXAMPLE_SUITE_DASHBOARD_ALIAS}/items/${row.id}`,
                }),
              ]
            : [
                buildTableAction.custom({
                  render: <span style={{ opacity: 0.72 }}>Shared</span>,
                }),
              ],
      }),
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search dashboard items',
        columns: ['title'],
      },
    },
    pagination: {
      pageSize: 8,
    },
  });
}

function buildRecentItemsTableDefinition(items: ExampleSuiteAdminTableRow[]) {
  return defineBuildTable<ExampleSuiteAdminTableRow, any>({
    data: items,
    header: {
      title: 'Recent local records',
      description:
        'Small local companion table on the create route to contrast with the remote admin list.',
    },
    columns: [
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'title',
        header: 'Title',
        searchable: true,
        cell: (row) => <strong>{row.title}</strong>,
      }),
      buildTableColumn.custom<ExampleSuiteAdminTableRow>({
        key: 'status',
        header: 'Status',
        cell: (row) => <ExampleSuiteStatusPill value={row.status} />,
      }),
      buildTableColumn.text<ExampleSuiteAdminTableRow>({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (row) => <code>{row.updatedAtLabel}</code>,
      }),
      buildTableColumn.actions<ExampleSuiteAdminTableRow>({
        key: 'actions',
        header: 'Actions',
        actions: (row) => [
          buildTableAction.link({
            label: 'Edit',
            href: `${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${row.id}`,
          }),
        ],
      }),
    ],
    pagination: {
      pageSize: 5,
    },
  });
}

export function ExampleSuiteAdminItemsDataTable({
  items,
}: {
  items: ExampleSuiteAdminTableRow[];
}) {
  return (
    <DataTable
      definition={buildAdminItemsTableDefinition(items)}
      className="example-suite-data-table"
      tableClassName="min-w-[940px]"
    />
  );
}

export function ExampleSuiteDashboardItemsDataTable({
  items,
}: {
  items: ExampleSuiteDashboardTableRow[];
}) {
  return (
    <DataTable
      definition={buildDashboardItemsTableDefinition(items)}
      className="example-suite-data-table"
      tableClassName="min-w-[760px]"
    />
  );
}

export function ExampleSuiteRecentItemsDataTable({
  items,
}: {
  items: ExampleSuiteAdminTableRow[];
}) {
  return (
    <DataTable
      definition={buildRecentItemsTableDefinition(items)}
      className="example-suite-data-table"
      tableClassName="min-w-[620px]"
    />
  );
}
