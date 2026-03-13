'use client';

import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable
} from '@skitsaas/sdk';
import { HUB_FEATURES, type HubMemberRow } from './demo-data';

const hubFeaturesTable = defineBuildTable<(typeof HUB_FEATURES)[number], any>({
  data: HUB_FEATURES,
  columns: [
    buildTableColumn.text<(typeof HUB_FEATURES)[number]>({
      key: 'feature',
      header: 'Feature',
      cell: (row) => <strong>{row.feature}</strong>
    }),
    buildTableColumn.text<(typeof HUB_FEATURES)[number]>({
      key: 'description',
      header: 'What you get'
    }),
    buildTableColumn.custom<(typeof HUB_FEATURES)[number]>({
      key: 'included',
      header: 'Included',
      cell: (row) => (
        <span
          className={`hub-included--${row.included === 'Included' ? 'included' : 'pro'}`}
        >
          {row.included}
        </span>
      )
    })
  ],
  pagination: {
    pageSize: 10
  }
});

function createHubMembersTable(items: HubMemberRow[]) {
  return defineBuildTable<HubMemberRow, any>({
    data: items,
    columns: [
      buildTableColumn.text<HubMemberRow>({
        key: 'name',
        header: 'Member',
        searchable: true,
        sortable: true,
        cell: (row) => <strong>{row.name}</strong>
      }),
      buildTableColumn.text<HubMemberRow>({
        key: 'role',
        header: 'Role',
        searchable: true
      }),
      buildTableColumn.text<HubMemberRow>({
        key: 'joinedAt',
        header: 'Joined',
        sortable: true
      }),
      buildTableColumn.custom<HubMemberRow>({
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <span className={`hub-status hub-status--${row.status}`}>
            {row.status}
          </span>
        )
      }),
      buildTableColumn.actions<HubMemberRow>({
        key: 'actions',
        header: 'Actions',
        actions: (row) => [
          buildTableAction.link({
            label: 'Open profile',
            href: `/hub/members/${row.id}`
          })
        ]
      })
    ],
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search members',
        columns: ['name', 'role']
      },
      filters: [
        buildTableFilter.select<HubMemberRow>({
          id: 'status',
          label: 'Status',
          column: 'status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]
        })
      ]
    },
    pagination: {
      pageSize: 8
    }
  });
}

export function HubFeaturesDataTable() {
  return (
    <DataTable
      definition={hubFeaturesTable}
      labels={{ empty: 'No features listed.' }}
    />
  );
}

export function HubMembersDataTable({ items }: { items: HubMemberRow[] }) {
  return (
    <DataTable
      definition={createHubMembersTable(items)}
      labels={{ empty: 'No members found.' }}
    />
  );
}
