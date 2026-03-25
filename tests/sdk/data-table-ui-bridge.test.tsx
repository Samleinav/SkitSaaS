import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildTableColumn,
  defineBuildTable,
} from '../../app/sdk/src/datatables/definition';
import { DataTableUiAdapterProvider } from '../../app/sdk/src/ui/data-table-adapter';
import { DataTable } from '../../app/sdk/src/ui/data-table';
import { resolveSdkDataTableDefinition } from '../../app/sdk/src/ui/data-table-contract';

const baseTable = defineBuildTable({
  id: 'sdk-ui-bridge-table',
  data: [
    {
      name: 'Ada Lovelace',
    },
  ],
  columns: [
    buildTableColumn.text({
      key: 'name',
      header: 'Name',
    }),
  ],
});

test('DataTable delegates rendering to the host adapter provider when present', () => {
  const html = renderToStaticMarkup(
    <DataTableUiAdapterProvider
      adapter={{
        renderDataTable: ({ definition }) => (
          <div
            data-render-source="adapter"
            data-table-id={definition?.id ?? ''}
            data-column-count={String(definition?.columns.length ?? 0)}
          />
        ),
      }}
    >
      <DataTable definition={baseTable} />
    </DataTableUiAdapterProvider>
  );

  assert.match(html, /data-render-source="adapter"/);
  assert.match(html, /data-table-id="sdk-ui-bridge-table"/);
  assert.match(html, /data-column-count="1"/);
});

test('resolveSdkDataTableDefinition normalizes loose sdk props into a build table definition', () => {
  const resolved = resolveSdkDataTableDefinition({
    data: [
      {
        name: 'Grace Hopper',
      },
    ],
    columns: [
      buildTableColumn.text({
        key: 'name',
        header: 'Name',
      }),
    ],
    className: 'example-table',
    tableClassName: 'wide-table',
    labels: {
      empty: 'No records.',
    },
    pagination: {
      pageSize: 25,
    },
  });

  assert.equal(resolved.data.length, 1);
  assert.equal(resolved.columns.length, 1);
  assert.equal(resolved.className, 'example-table');
  assert.equal(resolved.tableClassName, 'wide-table');
  assert.equal(resolved.labels?.empty, 'No records.');
  assert.equal(resolved.pagination?.pageSize, 25);
});
