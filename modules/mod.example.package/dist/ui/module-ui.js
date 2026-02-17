import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const MODULE_STYLE = `
.example-package-layout { display: grid; gap: 1rem; }
.example-package-hero { border: 1px solid rgba(148,163,184,.45); border-radius: .75rem; padding: 1rem; background: linear-gradient(135deg, rgba(14,165,233,.1), transparent); }
.example-package-hero-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
.example-package-hero-description { margin: .35rem 0 0; font-size: .9rem; color: rgba(15,23,42,.75); }
.example-package-content { display: grid; gap: 1rem; }
.example-package-card { border: 1px solid rgba(148,163,184,.45); border-radius: .75rem; overflow: hidden; background: var(--color-background, #fff); }
.example-package-card-header { border-bottom: 1px solid rgba(148,163,184,.35); padding: .9rem 1rem; display: grid; gap: .35rem; }
.example-package-card-title { margin: 0; font-size: 1rem; font-weight: 700; }
.example-package-card-description { margin: 0; font-size: .86rem; color: rgba(15,23,42,.75); }
.example-package-card-body { display: grid; gap: .85rem; padding: 1rem; }
.example-package-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.example-package-button { display: inline-flex; align-items: center; justify-content: center; height: 2rem; padding: 0 .75rem; border-radius: .5rem; border: 1px solid transparent; font-size: .84rem; text-decoration: none; cursor: pointer; }
.example-package-button-primary { background: #0f766e; color: #f8fafc; }
.example-package-button-secondary { border-color: rgba(148,163,184,.65); background: #fff; color: #0f172a; }
.example-package-button-danger { background: #b91c1c; color: #fef2f2; }
.example-package-info-text { margin: 0; font-size: .9rem; }
.example-package-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid transparent; font-size: .72rem; line-height: 1; padding: .2rem .45rem; text-transform: lowercase; }
.example-package-badge-active { border-color: rgba(5,150,105,.6); background: rgba(5,150,105,.12); color: #065f46; }
.example-package-badge-archived { border-color: rgba(100,116,139,.6); background: rgba(100,116,139,.12); color: #334155; }
.example-package-badge-draft { border-color: rgba(217,119,6,.6); background: rgba(217,119,6,.12); color: #92400e; }
.example-package-table-wrap { overflow-x: auto; }
.example-package-table { width: 100%; min-width: 680px; border-collapse: collapse; }
.example-package-table-head-cell { text-align: left; font-size: .72rem; letter-spacing: .03em; text-transform: uppercase; color: rgba(15,23,42,.65); padding: .45rem; }
.example-package-table-row { border-top: 1px solid rgba(148,163,184,.45); }
.example-package-table-cell { padding: .5rem .45rem; vertical-align: top; font-size: .86rem; }
.example-package-label { display: block; font-size: .84rem; font-weight: 600; margin: 0 0 .25rem; }
.example-package-input, .example-package-textarea, .example-package-select { width: 100%; border-radius: .5rem; border: 1px solid rgba(148,163,184,.65); background: #fff; color: #0f172a; padding: .45rem .6rem; font-size: .88rem; }
.example-package-textarea { min-height: 6rem; resize: vertical; }
`;
function joinClassNames(...values) {
    return values.filter(Boolean).join(' ');
}
function asChildren(value) {
    if (Array.isArray(value)) {
        return value.filter((entry) => entry !== undefined && entry !== null);
    }
    if (value === undefined || value === null) {
        return [];
    }
    return [value];
}
function ModuleStyleTag() {
    return _jsx("style", { children: MODULE_STYLE });
}
export function ModuleLayout({ title, description, children }) {
    return (_jsxs("div", { className: "example-package-layout", children: [_jsx(ModuleStyleTag, {}), _jsxs("section", { className: "example-package-hero", children: [_jsx("h1", { className: "example-package-hero-title", children: title }), description ? (_jsx("p", { className: "example-package-hero-description", children: description })) : null] }), _jsx("section", { className: "example-package-content", children: asChildren(children) })] }));
}
export function ModuleCard({ title, description, children, actions }) {
    return (_jsxs("article", { className: "example-package-card", children: [_jsxs("header", { className: "example-package-card-header", children: [_jsx("h2", { className: "example-package-card-title", children: title }), description ? (_jsx("p", { className: "example-package-card-description", children: description })) : null, actions ? (_jsx("div", { className: "example-package-actions", children: asChildren(actions) })) : null] }), _jsx("div", { className: "example-package-card-body", children: asChildren(children) })] }));
}
export function ActionLink({ href, label }) {
    return (_jsx("a", { href: href, className: joinClassNames('example-package-button', 'example-package-button-secondary'), children: label }));
}
export function SubmitButton({ label, tone = 'primary' }) {
    return (_jsx("button", { type: "submit", className: joinClassNames('example-package-button', tone === 'danger'
            ? 'example-package-button-danger'
            : 'example-package-button-primary'), children: label }));
}
export function InfoText({ children }) {
    return _jsx("p", { className: "example-package-info-text", children: children });
}
export function Badge({ value }) {
    const normalized = String(value).trim().toLowerCase();
    let toneClass = 'example-package-badge-draft';
    if (normalized === 'active') {
        toneClass = 'example-package-badge-active';
    }
    else if (normalized === 'archived') {
        toneClass = 'example-package-badge-archived';
    }
    return (_jsx("span", { className: joinClassNames('example-package-badge', toneClass), children: normalized }));
}
export function DataTable({ headers, rows }) {
    return (_jsx("div", { className: "example-package-table-wrap", children: _jsxs("table", { className: "example-package-table", children: [_jsx("thead", { children: _jsx("tr", { children: headers.map((header) => (_jsx("th", { className: "example-package-table-head-cell", children: header }, header))) }) }), _jsx("tbody", { children: rows.map((cells, rowIndex) => (_jsx("tr", { className: "example-package-table-row", children: cells.map((cell, cellIndex) => (_jsx("td", { className: "example-package-table-cell", children: cell }, `${rowIndex}-${cellIndex}`))) }, rowIndex))) })] }) }));
}
export function FieldLabel({ htmlFor, label }) {
    return (_jsx("label", { htmlFor: htmlFor, className: "example-package-label", children: label }));
}
export function TextInput({ className, ...props }) {
    return (_jsx("input", { ...props, className: joinClassNames('example-package-input', className) }));
}
export function TextArea({ className, ...props }) {
    return (_jsx("textarea", { ...props, className: joinClassNames('example-package-textarea', className) }));
}
export function SelectInput({ className, children, ...props }) {
    return (_jsx("select", { ...props, className: joinClassNames('example-package-select', className), children: children }));
}
export function FormActions({ children }) {
    return _jsx("div", { className: "example-package-actions", children: asChildren(children) });
}
