import * as React from 'react';

export type SdkDataTableLabels = {
  empty?: string;
};

export type SdkDataTableColumn<TItem extends Record<string, unknown>> = {
  key: keyof TItem | string;
  header: React.ReactNode;
  cell?: (item: TItem) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<TItem extends Record<string, unknown>> = {
  data: TItem[];
  columns: SdkDataTableColumn<TItem>[];
  labels?: SdkDataTableLabels;
  className?: string;
  emptyState?: React.ReactNode;
};

function readCellValue<TItem extends Record<string, unknown>>(
  item: TItem,
  key: keyof TItem | string
) {
  if (typeof key !== 'string') {
    return item[key];
  }

  return item[key as keyof TItem];
}

export function DataTable<TItem extends Record<string, unknown>>({
  data,
  columns,
  labels,
  className,
  emptyState
}: DataTableProps<TItem>) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? <p>{labels?.empty ?? 'No records found.'}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <table>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={`${String(column.key)}-${index}`}
                className={column.headerClassName}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, columnIndex) => (
                <td
                  key={`${String(column.key)}-${columnIndex}`}
                  className={column.className}
                >
                  {column.cell
                    ? column.cell(item)
                    : String(readCellValue(item, column.key) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
