'use client';

import React from 'react';
import {
  DataTable,
  buildTableAction,
  buildTableColumn,
  defineBuildTable
} from '@skitsaas/sdk';
import { EXAMPLE_PACKAGE_API_BASE } from './constants';
import { Badge } from './ui/module-ui.jsx';

function buildAdminItemsTableDefinition({ items, adminAlias }) {
  return defineBuildTable({
    data: items,
    columns: [
      buildTableColumn.text({
        key: 'id',
        header: 'Id',
        sortable: true,
        cell: (item) => <code>{item.id}</code>
      }),
      buildTableColumn.text({
        key: 'title',
        header: 'Title',
        sortable: true,
        searchable: true,
        cell: (item) => <strong>{item.title}</strong>
      }),
      buildTableColumn.custom({
        key: 'status',
        header: 'Status',
        cell: (item) => <Badge value={item.status} />
      }),
      buildTableColumn.text({
        key: 'priority',
        header: 'Priority'
      }),
      buildTableColumn.text({
        key: 'visibilityLabel',
        header: 'Visibility'
      }),
      buildTableColumn.text({
        key: 'ownerLabel',
        header: 'Owner'
      }),
      buildTableColumn.text({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (item) => <code>{item.updatedAtLabel}</code>
      }),
      buildTableColumn.actions({
        key: 'actions',
        header: 'Actions',
        actions: (item) => [
          buildTableAction.link({
            label: 'Edit',
            href: `${adminAlias}/edit/${item.id}`
          }),
          buildTableAction.request({
            label: 'Delete',
            request: {
              url: `${EXAMPLE_PACKAGE_API_BASE}/items/${item.id}`,
              method: 'DELETE',
              reload: true,
              successMessage: 'Record deleted.'
            },
            confirm: {
              title: 'Delete record?',
              description: `This removes "${item.title}".`,
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel'
            }
          })
        ]
      })
    ],
    source: {
      url: `${EXAMPLE_PACKAGE_API_BASE}/items?scope=admin`,
      debounceMs: 250
    },
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search records',
        columns: ['title', 'ownerLabel']
      }
    },
    pagination: {
      pageSize: 10
    }
  });
}

function buildDashboardItemsTableDefinition({ items, dashboardAlias }) {
  return defineBuildTable({
    data: items,
    columns: [
      buildTableColumn.text({
        key: 'id',
        header: 'Id',
        sortable: true,
        cell: (item) => <code>{item.id}</code>
      }),
      buildTableColumn.custom({
        key: 'title',
        header: 'Title',
        searchable: true,
        cell: (item) => (
          <a href={`${dashboardAlias}/items/${item.id}`}>{item.title}</a>
        )
      }),
      buildTableColumn.custom({
        key: 'status',
        header: 'Status',
        cell: (item) => <Badge value={item.status} />
      }),
      buildTableColumn.text({
        key: 'priority',
        header: 'Priority'
      }),
      buildTableColumn.text({
        key: 'visibilityLabel',
        header: 'Visibility'
      }),
      buildTableColumn.text({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (item) => <code>{item.updatedAtLabel}</code>
      })
    ],
    source: {
      url: `${EXAMPLE_PACKAGE_API_BASE}/items`,
      debounceMs: 250
    },
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search records',
        columns: ['title']
      }
    },
    pagination: {
      pageSize: 10
    }
  });
}

function buildRecentItemsTableDefinition({ items }) {
  return defineBuildTable({
    data: items,
    header: {
      title: 'Recent local records',
      description:
        'Local companion table for the create route so the module shows both local and remote DataTable patterns.'
    },
    columns: [
      buildTableColumn.text({
        key: 'title',
        header: 'Title',
        searchable: true,
        cell: (item) => <strong>{item.title}</strong>
      }),
      buildTableColumn.custom({
        key: 'status',
        header: 'Status',
        cell: (item) => <Badge value={item.status} />
      }),
      buildTableColumn.text({
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (item) => <code>{item.updatedAtLabel}</code>
      })
    ],
    pagination: {
      pageSize: 5
    }
  });
}

export function ExamplePackageAdminItemsDataTable({
  items,
  adminAlias
}) {
  return (
    <DataTable
      definition={buildAdminItemsTableDefinition({
        items,
        adminAlias
      })}
      className="example-package-data-table"
      tableClassName="min-w-[960px]"
    />
  );
}

export function ExamplePackageDashboardItemsDataTable({
  items,
  dashboardAlias
}) {
  return (
    <DataTable
      definition={buildDashboardItemsTableDefinition({
        items,
        dashboardAlias
      })}
      className="example-package-data-table"
      tableClassName="min-w-[760px]"
    />
  );
}

export function ExamplePackageRecentItemsDataTable({ items }) {
  return (
    <DataTable
      definition={buildRecentItemsTableDefinition({
        items
      })}
      className="example-package-data-table"
      tableClassName="min-w-[620px]"
    />
  );
}
