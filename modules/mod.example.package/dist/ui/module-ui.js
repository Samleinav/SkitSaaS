import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const MODULE_STYLE = `
.example-package-layout { display: grid; gap: 1rem; color: var(--color-foreground, inherit); }
.example-package-hero { border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent); border-radius: .75rem; padding: 1rem; background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #0f766e) 10%, transparent), transparent); }
.example-package-hero-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
.example-package-hero-description { margin: .35rem 0 0; font-size: .9rem; color: color-mix(in srgb, var(--color-foreground, #111827) 72%, transparent); }
.example-package-content { display: grid; gap: 1rem; }
.example-package-card { border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent); border-radius: .75rem; overflow: hidden; background: var(--color-background, #fff); }
.example-package-card-header { border-bottom: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 55%, transparent); padding: .9rem 1rem; display: grid; gap: .35rem; }
.example-package-card-title { margin: 0; font-size: 1rem; font-weight: 700; }
.example-package-card-description { margin: 0; font-size: .86rem; color: color-mix(in srgb, var(--color-foreground, #111827) 72%, transparent); }
.example-package-card-body { display: grid; gap: .85rem; padding: 1rem; }
.example-package-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.example-package-button { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; height: 2rem; padding: 0 .75rem; border-radius: .5rem; border: 1px solid transparent; font-size: .84rem; text-decoration: none; cursor: pointer; }
.example-package-button-primary { background: var(--color-primary, #0f766e); color: var(--color-primary-foreground, #f8fafc); }
.example-package-button-secondary { border-color: color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); }
.example-package-button-danger { background: #b91c1c; color: #fef2f2; }
.example-package-info-text { margin: 0; font-size: .9rem; }
.example-package-badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid transparent; font-size: .72rem; line-height: 1; padding: .2rem .45rem; text-transform: lowercase; }
.example-package-badge-active { border-color: color-mix(in srgb, #059669 60%, transparent); background: color-mix(in srgb, #059669 12%, transparent); color: color-mix(in srgb, #059669 82%, var(--color-foreground, #111827)); }
.example-package-badge-archived { border-color: color-mix(in srgb, #64748b 60%, transparent); background: color-mix(in srgb, #64748b 12%, transparent); color: color-mix(in srgb, #64748b 82%, var(--color-foreground, #111827)); }
.example-package-badge-draft { border-color: color-mix(in srgb, #d97706 60%, transparent); background: color-mix(in srgb, #d97706 12%, transparent); color: color-mix(in srgb, #d97706 82%, var(--color-foreground, #111827)); }
.example-package-label { display: block; font-size: .84rem; font-weight: 600; margin: 0 0 .25rem; }
.example-package-input, .example-package-textarea, .example-package-select { width: 100%; border-radius: .5rem; border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); padding: .45rem .6rem; font-size: .88rem; }
.example-package-textarea { min-height: 6rem; resize: vertical; }
.example-package-data-table { display: grid; gap: .85rem; }
.example-package-data-table .sdk-data-table__header,
.example-package-data-table .sdk-data-table__toolbar,
.example-package-data-table .sdk-data-table__pagination { display: flex; align-items: center; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
.example-package-data-table .sdk-data-table__header-title { margin: 0; font-size: 1rem; font-weight: 700; }
.example-package-data-table .sdk-data-table__header-description,
.example-package-data-table .sdk-data-table__pagination-summary,
.example-package-data-table .sdk-data-table__filter-label { color: color-mix(in srgb, var(--color-foreground, #111827) 70%, transparent); font-size: .84rem; }
.example-package-data-table .sdk-data-table__toolbar-content,
.example-package-data-table .sdk-data-table__toolbar-filters,
.example-package-data-table .sdk-data-table__pagination-actions,
.example-package-data-table .sdk-data-table__cell-actions,
.example-package-data-table .sdk-data-table__confirm-actions { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.example-package-data-table .sdk-data-table__filter,
.example-package-data-table .sdk-data-table__pagination-page-size { display: inline-flex; align-items: center; gap: .4rem; }
.example-package-data-table .sdk-data-table__toolbar-search,
.example-package-data-table .sdk-data-table__filter input,
.example-package-data-table .sdk-data-table__filter select,
.example-package-data-table .sdk-data-table__pagination-page-size select { border-radius: .5rem; border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); min-height: 2.25rem; padding: .45rem .7rem; }
.example-package-data-table .sdk-data-table__toolbar-search { min-width: 16rem; }
.example-package-data-table .sdk-data-table__table { width: 100%; border-collapse: collapse; }
.example-package-data-table .sdk-data-table__table th { padding: .6rem .55rem; text-align: left; font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: color-mix(in srgb, var(--color-foreground, #111827) 65%, transparent); }
.example-package-data-table .sdk-data-table__table td { padding: .7rem .55rem; vertical-align: top; border-top: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 70%, transparent); }
.example-package-data-table .sdk-data-table__sort-button { display: inline-flex; align-items: center; gap: .2rem; border: 0; background: transparent; color: inherit; font: inherit; padding: 0; cursor: pointer; }
.example-package-data-table .sdk-data-table__sort-indicator { opacity: .7; }
.example-package-data-table .sdk-data-table__cell-actions a,
.example-package-data-table .sdk-data-table__cell-actions button,
.example-package-data-table .sdk-data-table__header-actions a,
.example-package-data-table .sdk-data-table__header-actions button,
.example-package-data-table .sdk-data-table__toolbar-actions a,
.example-package-data-table .sdk-data-table__toolbar-actions button,
.example-package-data-table .sdk-data-table__pagination-actions button,
.example-package-data-table .sdk-data-table__confirm-actions button { display: inline-flex; align-items: center; justify-content: center; min-height: 2rem; padding: 0 .75rem; border-radius: .5rem; border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 85%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); font-size: .84rem; text-decoration: none; cursor: pointer; }
.example-package-data-table .sdk-data-table__empty { padding: 1rem 0; color: color-mix(in srgb, var(--color-foreground, #111827) 70%, transparent); }
.example-package-data-table .sdk-data-table__confirm-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .58); display: grid; place-items: center; padding: 1rem; z-index: 60; }
.example-package-data-table .sdk-data-table__confirm-dialog { width: min(100%, 28rem); border-radius: .9rem; border: 1px solid color-mix(in srgb, var(--color-border, #d5d7db) 80%, transparent); background: var(--color-background, #fff); color: var(--color-foreground, #111827); padding: 1rem; display: grid; gap: .85rem; box-shadow: 0 24px 80px rgba(15, 23, 42, .35); }
.example-package-data-table .sdk-data-table__confirm-title { margin: 0; font-size: 1rem; font-weight: 700; }
.example-package-data-table .sdk-data-table__confirm-description { margin: .35rem 0 0; color: color-mix(in srgb, var(--color-foreground, #111827) 70%, transparent); }
@media (max-width: 900px) {
  .example-package-data-table .sdk-data-table__toolbar-search { min-width: 100%; }
}
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
