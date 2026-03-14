'use client';

import {
  DataTable,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
} from '@skitsaas/sdk';

type ExampleAdminTemplateRow = {
  id: string;
  template: string;
  area: string;
  mode: string;
  status: string;
  owner: string;
};

const EXAMPLE_ADMIN_TEMPLATES: ExampleAdminTemplateRow[] = [
  {
    id: 'tpl-admin-forms',
    template: 'Admin Forms Refresh',
    area: 'admin',
    mode: 'local table',
    status: 'ready',
    owner: 'Core UX',
  },
  {
    id: 'tpl-dashboard-remote',
    template: 'Remote Table Showcase',
    area: 'dashboard',
    mode: 'source.url',
    status: 'pilot',
    owner: 'Module Runtime',
  },
  {
    id: 'tpl-portal-skin',
    template: 'Portal Skin',
    area: 'portal',
    mode: 'module css',
    status: 'active',
    owner: 'Portal Team',
  },
];

const adminTemplatesTable = defineBuildTable<ExampleAdminTemplateRow, any>({
  data: EXAMPLE_ADMIN_TEMPLATES,
  header: {
    title: 'Local DataTable Demo',
    description:
      'This table is intentionally local so the example set contrasts with remote module tables.',
  },
  columns: [
    buildTableColumn.text<ExampleAdminTemplateRow>({
      key: 'template',
      header: 'Template',
      sortable: true,
      searchable: true,
      cell: (row) => <strong>{row.template}</strong>,
    }),
    buildTableColumn.text<ExampleAdminTemplateRow>({
      key: 'area',
      header: 'Area',
      sortable: true,
    }),
    buildTableColumn.text<ExampleAdminTemplateRow>({
      key: 'mode',
      header: 'Pattern',
      searchable: true,
    }),
    buildTableColumn.custom<ExampleAdminTemplateRow>({
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <span className={`example-admin-pill example-admin-pill--${row.status}`}>
          {row.status}
        </span>
      ),
    }),
    buildTableColumn.text<ExampleAdminTemplateRow>({
      key: 'owner',
      header: 'Owner',
      searchable: true,
    }),
  ],
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search templates',
      columns: ['template', 'mode', 'owner'],
    },
    filters: [
      buildTableFilter.select<ExampleAdminTemplateRow>({
        id: 'status',
        label: 'Status',
        column: 'status',
        options: [
          { value: 'ready', label: 'Ready' },
          { value: 'pilot', label: 'Pilot' },
          { value: 'active', label: 'Active' },
        ],
      }),
    ],
  },
  pagination: {
    pageSize: 5,
  },
});

export function ExampleAdminShowcaseTable() {
  return <DataTable definition={adminTemplatesTable} className="example-admin-data-table" />;
}
