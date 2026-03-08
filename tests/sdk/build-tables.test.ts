import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type BuildTableDefinition,
  buildTableAction,
  buildTableColumn,
  buildTableFilter,
  composeBuildTableDefinition,
  defineBuildTable,
  withBuildTableData,
  withBuildTableQuery
} from '../../app/sdk/src/datatables/definition';
import {
  createBuildTableQuerySearchParams,
  parseBuildTableQueryState
} from '../../app/sdk/src/datatables/query';
import {
  createBuildTableRequestDescriptor,
  resolveBuildTableRemoteListResult,
  resolveBuildTableRemoteListUrl
} from '../../app/sdk/src/datatables/remote';
import { resolveBuildTableView } from '../../app/sdk/src/datatables/state';
import { DataTable } from '../../app/sdk/src/ui/data-table';

test('sdk root exposes build table helpers from the client-safe entry', async () => {
  const rootSdk = await import(
    new URL('../../app/sdk/dist/index.js', import.meta.url).href
  );

  assert.equal(typeof rootSdk.defineBuildTable, 'function');
  assert.equal(typeof rootSdk.composeBuildTableDefinition, 'function');
  assert.equal(typeof rootSdk.buildTableAction.button, 'function');
  assert.equal(typeof rootSdk.buildTableFilter.select, 'function');
  assert.equal(typeof rootSdk.resolveBuildTableView, 'function');
});

test('build table helpers merge query, filters, header actions, and pagination predictably', () => {
  type TestUserRow = {
    name: string;
    status: string;
  };

  const baseTable = defineBuildTable<
    TestUserRow,
    BuildTableDefinition<TestUserRow>
  >({
    id: 'users-table',
    data: [] as TestUserRow[],
    columns: [
      buildTableColumn.text<TestUserRow>({
        key: 'name',
        header: 'Name'
      })
    ],
    labels: {
      empty: 'No users yet.'
    },
    header: {
      title: 'Users'
    }
  });

  const withData = withBuildTableData<
    TestUserRow,
    BuildTableDefinition<TestUserRow>
  >(baseTable, [
    {
      name: 'Ada',
      status: 'active'
    }
  ]);
  const composed = composeBuildTableDefinition<
    TestUserRow,
    BuildTableDefinition<TestUserRow>
  >(withData, {
    header: {
      description: 'Administrators and operators',
      actions: [
        buildTableAction.link({
          label: 'Create',
          href: '/admin/users/create'
        })
      ]
    },
    toolbar: {
      content: 'Search and filters',
      search: {
        enabled: true,
        placeholder: 'Search users'
      },
      filters: [
        buildTableFilter.select({
          id: 'status',
          label: 'Status',
          column: 'status',
          options: [{ value: 'active', label: 'Active' }]
        })
      ],
      actions: [
        buildTableAction.button({
          label: 'Export'
        })
      ]
    },
    pagination: {
      pageSize: 25,
      pageSizeOptions: [10, 25, 50]
    },
    query: {
      search: 'Ada'
    }
  });

  assert.equal(composed.data.length, 1);
  assert.equal(composed.header?.title, 'Users');
  assert.equal(composed.header?.description, 'Administrators and operators');
  assert.equal(composed.header?.actions?.[0]?.kind, 'link');
  assert.equal(composed.toolbar?.actions?.[0]?.kind, 'button');
  assert.equal(composed.toolbar?.search?.enabled, true);
  assert.equal(composed.toolbar?.filters?.[0]?.kind, 'select');
  assert.equal(composed.pagination?.pageSize, 25);
  assert.equal(composed.query?.search, 'Ada');
});

test('build table query helpers round-trip sorting, search, filters, and pagination', () => {
  const parsed = parseBuildTableQueryState(
    'search=ada&sort=name&dir=desc&page=2&pageSize=25&filter.status=active'
  );

  assert.deepEqual(parsed, {
    search: 'ada',
    sorting: {
      columnId: 'name',
      direction: 'desc'
    },
    page: 2,
    pageSize: 25,
    filters: {
      status: 'active'
    }
  });

  const serialized = createBuildTableQuerySearchParams(parsed);

  assert.equal(serialized.get('search'), 'ada');
  assert.equal(serialized.get('sort'), 'name');
  assert.equal(serialized.get('dir'), 'desc');
  assert.equal(serialized.get('page'), '2');
  assert.equal(serialized.get('pageSize'), '25');
  assert.equal(serialized.get('filter.status'), 'active');
});

test('build table remote helpers serialize query, list payloads, and request bodies predictably', () => {
  const remoteUrl = resolveBuildTableRemoteListUrl(
    {
      url: '/api/items?scope=admin'
    },
    {
      search: 'ada',
      sorting: {
        columnId: 'name',
        direction: 'desc'
      },
      filters: {
        status: 'active'
      },
      page: 2,
      pageSize: 25
    }
  );

  assert.match(remoteUrl, /^\/api\/items\?/);
  assert.match(remoteUrl, /scope=admin/);
  assert.match(remoteUrl, /search=ada/);
  assert.match(remoteUrl, /sort=name/);
  assert.match(remoteUrl, /dir=desc/);
  assert.match(remoteUrl, /page=2/);
  assert.match(remoteUrl, /pageSize=25/);
  assert.match(remoteUrl, /filter.status=active/);

  const remoteResult = resolveBuildTableRemoteListResult<{
    name: string;
  }>({
    data: {
      rows: [{ name: 'Ada Lovelace' }],
      totalCount: 1,
      currentPage: 2,
      perPage: 25
    }
  }, {
    url: '/api/items',
    response: {
      itemsKey: 'data.rows',
      totalKey: 'data.totalCount',
      pageKey: 'data.currentPage',
      pageSizeKey: 'data.perPage'
    }
  });

  assert.equal(remoteResult.items[0]?.name, 'Ada Lovelace');
  assert.equal(remoteResult.total, 1);
  assert.equal(remoteResult.page, 2);
  assert.equal(remoteResult.pageSize, 25);

  const requestDescriptor = createBuildTableRequestDescriptor({
    url: '/api/items/1',
    method: 'DELETE',
    body: {
      hardDelete: true
    }
  });

  assert.equal(requestDescriptor.url, '/api/items/1');
  assert.equal(requestDescriptor.init.method, 'DELETE');
  assert.equal(
    (requestDescriptor.init.headers as Record<string, string>)['Content-Type'],
    'application/json'
  );
  assert.equal(requestDescriptor.init.body, '{"hardDelete":true}');
});

test('build table state resolver applies search, filters, sorting, and pagination', () => {
  const table = withBuildTableQuery(
    defineBuildTable({
      data: [
        {
          name: 'Ada Lovelace',
          status: 'active'
        },
        {
          name: 'Grace Hopper',
          status: 'active'
        },
        {
          name: 'Alan Turing',
          status: 'draft'
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
      toolbar: {
        search: {
          enabled: true,
          columns: ['name']
        },
        filters: [
          buildTableFilter.select({
            id: 'status',
            column: 'status',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' }
            ]
          })
        ]
      },
      pagination: {
        pageSize: 1
      }
    }),
    {
      search: 'a',
      filters: {
        status: 'active'
      },
      sorting: {
        columnId: 'name',
        direction: 'desc'
      },
      page: 2
    }
  );

  const view = resolveBuildTableView(table);

  assert.equal(view.filteredItems, 2);
  assert.equal(view.totalPages, 2);
  assert.equal(view.page, 2);
  assert.equal(view.items.length, 1);
  assert.equal(view.items[0]?.name, 'Ada Lovelace');
});

test('sdk data table renders header actions, search, filters, pagination, and initial query state', () => {
  const table = withBuildTableQuery(
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
        description: 'System access overview',
        actions: [
          buildTableAction.link({
            label: 'Create user',
            href: '/admin/users/create',
            className: 'header-link'
          }),
          buildTableAction.button({
            label: 'Export',
            className: 'header-button'
          }),
          buildTableAction.custom({
            render: React.createElement('span', null, 'Custom header button')
          })
        ],
        content: React.createElement('span', null, 'Header summary')
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
            placeholder: 'All statuses',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' }
            ]
          })
        ],
        content: React.createElement('span', null, 'Toolbar filters'),
        actions: [
          buildTableAction.button({
            label: 'Refresh'
          }),
          buildTableAction.request({
            label: 'Delete selected',
            request: {
              url: '/api/users/bulk-delete',
              method: 'DELETE'
            },
            confirm: {
              title: 'Delete selected users?',
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel'
            }
          })
        ]
      },
      pagination: {
        pageSize: 1,
        pageSizeOptions: [1, 2]
      }
    }),
    {
      filters: {
        status: 'active'
      },
      sorting: {
        columnId: 'name',
        direction: 'desc'
      },
      page: 2
    }
  );

  const html = renderToStaticMarkup(
    React.createElement(DataTable, {
      definition: table
    })
  );

  assert.match(html, /Users/);
  assert.match(html, /System access overview/);
  assert.match(html, /Create user/);
  assert.match(html, /Export/);
  assert.match(html, /Custom header button/);
  assert.match(html, /Header summary/);
  assert.match(html, /Toolbar filters/);
  assert.match(html, /Search users/);
  assert.match(html, /All statuses/);
  assert.match(html, /Delete selected/);
  assert.match(html, /Ada Lovelace/);
  assert.match(html, /Page 2 of 2/);
  assert.doesNotMatch(html, /Grace Hopper/);
});
