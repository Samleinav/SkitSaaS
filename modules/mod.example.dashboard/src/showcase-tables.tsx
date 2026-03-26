'use client';

import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
} from '@skitsaas/sdk';
import {
  listExampleDashboardMilestones,
  listExampleDashboardPlaybooks,
  type ExampleDashboardMilestoneRow,
  type ExampleDashboardPlaybookRow,
} from './data';

const EXAMPLE_DASHBOARD_ALIAS = '/dashboard/custom/example-dashboard';
const EXAMPLE_DASHBOARD_FRONTEND_ALIAS = '/features/example-dashboard';
const EXAMPLE_DASHBOARD_PLAYBOOKS_API =
  '/api/modules/mod.example.dashboard/showcase-playbooks';

function getMilestoneAction(row: ExampleDashboardMilestoneRow) {
  if (row.area === 'frontend') {
    return buildTableAction.link({
      label: 'Open frontend',
      href: EXAMPLE_DASHBOARD_FRONTEND_ALIAS,
    });
  }

  return buildTableAction.link({
    label: 'Open dashboard',
    href: EXAMPLE_DASHBOARD_ALIAS,
  });
}

const milestonesTable = defineBuildTable<ExampleDashboardMilestoneRow, any>({
  data: listExampleDashboardMilestones(),
  header: {
    title: 'Local module milestones',
    description:
      'This dashboard-side table is local on purpose so authors can compare it with the frontend remote example.',
  },
  columns: [
    buildTableColumn.text<ExampleDashboardMilestoneRow>({
      key: 'milestone',
      header: 'Milestone',
      searchable: true,
      sortable: true,
      cell: (row) => <strong>{row.milestone}</strong>,
    }),
    buildTableColumn.text<ExampleDashboardMilestoneRow>({
      key: 'pattern',
      header: 'Pattern',
      searchable: true,
    }),
    buildTableColumn.text<ExampleDashboardMilestoneRow>({
      key: 'area',
      header: 'Area',
      sortable: true,
    }),
    buildTableColumn.text<ExampleDashboardMilestoneRow>({
      key: 'owner',
      header: 'Owner',
      searchable: true,
    }),
    buildTableColumn.actions<ExampleDashboardMilestoneRow>({
      key: 'actions',
      header: 'Actions',
      actions: (row) => [getMilestoneAction(row)],
    }),
  ],
  toolbar: {
    search: {
      enabled: true,
      placeholder: 'Search milestones',
      columns: ['milestone', 'pattern', 'owner'],
    },
  },
  pagination: {
    pageSize: 5,
  },
});

function createRemotePlaybooksTable() {
  return defineBuildTable<ExampleDashboardPlaybookRow, any>({
    data: listExampleDashboardPlaybooks(),
    header: {
      title: 'Remote source.url example',
      description:
        'This table fetches through the module API so authors can inspect the full remote query lifecycle.',
    },
    columns: [
      buildTableColumn.text<ExampleDashboardPlaybookRow>({
        key: 'title',
        header: 'Playbook',
        searchable: true,
        sortable: true,
        cell: (row) => <strong>{row.title}</strong>,
      }),
      buildTableColumn.custom<ExampleDashboardPlaybookRow>({
        key: 'stage',
        header: 'Stage',
        cell: (row) => (
          <span className={`example-dashboard-stage example-dashboard-stage--${row.stage}`}>
            {row.stage}
          </span>
        ),
      }),
      buildTableColumn.text<ExampleDashboardPlaybookRow>({
        key: 'owner',
        header: 'Owner',
        searchable: true,
      }),
      buildTableColumn.text<ExampleDashboardPlaybookRow>({
        key: 'cadence',
        header: 'Cadence',
      }),
      buildTableColumn.text<ExampleDashboardPlaybookRow>({
        key: 'visibility',
        header: 'Visibility',
      }),
      buildTableColumn.actions<ExampleDashboardPlaybookRow>({
        key: 'actions',
        header: 'Actions',
        actions: (row) => [
          buildTableAction.link({
            label: 'Open API',
            href: `${EXAMPLE_DASHBOARD_PLAYBOOKS_API}?search=${encodeURIComponent(row.title)}`,
            target: '_blank',
            rel: 'noreferrer',
          }),
        ],
      }),
    ],
    source: {
      url: EXAMPLE_DASHBOARD_PLAYBOOKS_API,
      debounceMs: 200,
    },
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search playbooks',
        columns: ['title', 'owner'],
      },
      filters: [
        buildTableFilter.select<ExampleDashboardPlaybookRow>({
          id: 'stage',
          label: 'Stage',
          column: 'stage',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'pilot', label: 'Pilot' },
            { value: 'live', label: 'Live' },
          ],
        }),
      ],
    },
    pagination: {
      pageSize: 5,
      pageSizeOptions: [5, 10],
    },
  });
}

export function ExampleDashboardMilestonesTable() {
  return <DataTable definition={milestonesTable} />;
}

export function ExampleDashboardPlaybooksTable() {
  return <DataTable definition={createRemotePlaybooksTable()} />;
}
