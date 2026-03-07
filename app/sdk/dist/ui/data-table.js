import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function readCellValue(item, key) {
    if (typeof key !== 'string') {
        return item[key];
    }
    return item[key];
}
export function DataTable({ data, columns, labels, className, emptyState }) {
    if (!Array.isArray(data) || data.length === 0) {
        return (_jsx("div", { className: className, children: emptyState ?? _jsx("p", { children: labels?.empty ?? 'No records found.' }) }));
    }
    return (_jsx("div", { className: className, children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: columns.map((column, index) => (_jsx("th", { className: column.headerClassName, children: column.header }, `${String(column.key)}-${index}`))) }) }), _jsx("tbody", { children: data.map((item, rowIndex) => (_jsx("tr", { children: columns.map((column, columnIndex) => (_jsx("td", { className: column.className, children: column.cell
                                ? column.cell(item)
                                : String(readCellValue(item, column.key) ?? '') }, `${String(column.key)}-${columnIndex}`))) }, rowIndex))) })] }) }));
}
