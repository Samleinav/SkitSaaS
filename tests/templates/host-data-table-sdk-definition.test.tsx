import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  defineBuildTable,
  withBuildTableQuery
} from '../../app/sdk/src/datatables/definition';
import { DataTable } from '../../components/ui/data-table';

test('host data table renders sdk build-table definitions with search, filters, and pagination', () => {
  const definition = withBuildTableQuery(
    defineBuildTable({
      data: [
        {
          name: 'Ada Lovelace',
          status: 'active'
        },
        {
          name: 'Grace Hopper',
          status: 'active'
        }
      ],
      columns: [
        buildTableColumn.text({
          key: 'name',
          header: 'Name',
          sortable: true
        }),
        buildTableColumn.text({
          key: 'status',
          header: 'Status'
        })
      ],
      header: {
        title: 'Users',
        actions: [
          buildTableAction.link({
            label: 'Create user',
            href: '/admin/users/create'
          })
        ]
      },
      toolbar: {
        search: {
          enabled: true,
          placeholder: 'Search users'
        },
        filters: [
          buildTableFilter.select({
            id: 'status',
            label: 'Status',
            column: 'status',
            placeholder: 'Status',
            options: [{ value: 'active', label: 'Active' }]
          })
        ]
      },
      pagination: {
        pageSize: 1
      }
    }),
    {
      sorting: {
        columnId: 'name',
        direction: 'desc'
      },
      page: 2
    }
  );

  const html = renderToStaticMarkup(
    createElement(DataTable, {
      definition,
      labels: {
        filterPlaceholder: 'Filter...',
        columns: 'Columns',
        noResults: 'No results.',
        showingRows: 'Showing {shown} of {filtered} rows',
        previous: 'Previous',
        next: 'Next'
      }
    })
  );

  assert.match(html, /Users/);
  assert.match(html, /Create user/);
  assert.match(html, /Search users/);
  assert.match(html, /Status/);
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /Page 2 of 2/);
  assert.doesNotMatch(html, /Grace Hopper/);
});

test('host data table merges sdk header content and toolbar actions with external toolbarActions prop', () => {
  const definition = defineBuildTable({
    data: [{ name: 'Ada Lovelace', status: 'active' }],
    columns: [
      buildTableColumn.text({
        key: 'name',
        header: 'Name'
      }),
      buildTableColumn.text({
        key: 'status',
        header: 'Status'
      })
    ],
    header: {
      title: 'Users',
      content: createElement('span', null, 'Header metrics'),
      actions: [
        buildTableAction.button({
          label: 'Export CSV'
        })
      ]
    },
    toolbar: {
      actions: [
        buildTableAction.link({
          label: 'Refresh',
          href: '/admin/users'
        })
      ]
    }
  });

  const html = renderToStaticMarkup(
    createElement(DataTable, {
      definition,
      toolbarActions: createElement('button', { type: 'button' }, 'Create user'),
      labels: {
        filterPlaceholder: 'Filter...',
        columns: 'Columns',
        noResults: 'No results.',
        showingRows: 'Showing {shown} of {filtered} rows',
        previous: 'Previous',
        next: 'Next'
      }
    })
  );

  assert.match(html, /Header metrics/);
  assert.match(html, /Export CSV/);
  assert.match(html, /Refresh/);
  assert.match(html, /Create user/);
});
