import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildTableColumn,
  defineBuildTable,
} from '../../app/sdk/src/datatables/definition';
import { DataTable } from '../../components/ui/data-table';

test('host DataTable keeps sdk semantic classes when rendering build table definitions', () => {
  const table = defineBuildTable({
    data: [
      {
        name: 'Ada Lovelace',
        status: 'active',
      },
    ],
    columns: [
      buildTableColumn.text({
        key: 'name',
        header: 'Name',
        searchable: true,
        sortable: true,
      }),
      buildTableColumn.text({
        key: 'status',
        header: 'Status',
      }),
    ],
    header: {
      title: 'Users',
      description: 'Host renderer bridge',
    },
    toolbar: {
      search: {
        enabled: true,
        placeholder: 'Search users',
      },
    },
    pagination: {
      pageSize: 10,
    },
  });

  const html = renderToStaticMarkup(
    <DataTable definition={table} className="example-suite-data-table" />
  );

  assert.match(html, /example-suite-data-table/);
  assert.match(html, /sdk-data-table/);
  assert.match(html, /sdk-data-table__header/);
  assert.match(html, /sdk-data-table__toolbar-search/);
  assert.match(html, /sdk-data-table__table/);
  assert.match(html, /sdk-data-table__pagination-summary/);
});
