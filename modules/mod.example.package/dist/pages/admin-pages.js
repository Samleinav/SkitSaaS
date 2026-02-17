import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { EXAMPLE_PACKAGE_ADMIN_ALIAS, EXAMPLE_PACKAGE_API_BASE, EXAMPLE_PACKAGE_DASHBOARD_ALIAS, toPositiveInt } from '../constants.js';
import { createExamplePackageItemAdminAction, deleteExamplePackageItemAdminAction, updateExamplePackageItemAdminAction, updateExamplePackageSettingsAdminAction } from '../actions.js';
import { getExamplePackageItemById, getExamplePackageSettings, listExamplePackageItemsForAdmin } from '../data.js';
import { ActionLink, Badge, DataTable, FieldLabel, FormActions, InfoText, ModuleCard, ModuleLayout, SelectInput, SubmitButton, TextArea, TextInput } from '../ui/module-ui.js';
function formatDate(value) {
    return value.toISOString().replace('T', ' ').slice(0, 16);
}
function statusOptions(defaultValue) {
    return (_jsxs(SelectInput, { id: "status", name: "status", defaultValue: defaultValue, children: [_jsx("option", { value: "draft", children: "draft" }), _jsx("option", { value: "active", children: "active" }), _jsx("option", { value: "archived", children: "archived" })] }));
}
function visibilityCheckbox(defaultChecked) {
    return (_jsxs("label", { children: [_jsx("input", { type: "checkbox", name: "isPublic", value: "true", defaultChecked: defaultChecked }), ' ', "Public visibility"] }));
}
export async function renderExamplePackageAdminHomePage() {
    const [settings, items] = await Promise.all([
        getExamplePackageSettings(),
        listExamplePackageItemsForAdmin(100)
    ]);
    const rows = items.map((item) => [
        _jsx("code", { children: item.id }, `id-${item.id}`),
        _jsx("strong", { children: item.title }, `title-${item.id}`),
        _jsx(Badge, { value: item.status }, `status-${item.id}`),
        String(item.priority),
        item.isPublic ? 'public' : 'private',
        item.ownerName || item.ownerEmail || '-',
        _jsx("code", { children: formatDate(item.updatedAt) }, `updated-${item.id}`),
        _jsxs("div", { children: [_jsx("a", { href: `${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${item.id}`, children: "Edit" }), ' ', _jsxs("form", { action: deleteExamplePackageItemAdminAction, style: { display: 'inline' }, children: [_jsx("input", { type: "hidden", name: "itemId", value: item.id }), _jsx(SubmitButton, { label: "Delete", tone: "danger" })] })] }, `actions-${item.id}`)
    ]);
    return (_jsxs(ModuleLayout, { title: "Example Package Admin", description: "Full source-package example with module-owned actions, API and DB.", children: [_jsxs(ModuleCard, { title: "Summary", description: "Runtime module settings and route aliases.", actions: [
                    _jsx(ActionLink, { href: `${EXAMPLE_PACKAGE_ADMIN_ALIAS}/create`, label: "Create Record" }, "create"),
                    _jsx(ActionLink, { href: `${EXAMPLE_PACKAGE_ADMIN_ALIAS}/settings`, label: "Settings" }, "settings")
                ], children: [_jsxs(InfoText, { children: ["Admin alias: ", EXAMPLE_PACKAGE_ADMIN_ALIAS] }), _jsxs(InfoText, { children: ["Dashboard alias: ", EXAMPLE_PACKAGE_DASHBOARD_ALIAS] }), _jsxs(InfoText, { children: ["API base: ", EXAMPLE_PACKAGE_API_BASE] }), _jsxs(InfoText, { children: ["Dashboard create: ", settings.allowDashboardCreate ? 'enabled' : 'disabled', " | API write mode: ", settings.apiWriteMode, " | Default status:", ' ', settings.defaultStatus] })] }), _jsx(ModuleCard, { title: "Stored Records", description: "Backed by mod_example_package_items.", children: rows.length === 0 ? (_jsx(InfoText, { children: "No records yet." })) : (_jsx(DataTable, { headers: [
                        'Id',
                        'Title',
                        'Status',
                        'Priority',
                        'Visibility',
                        'Owner',
                        'Updated',
                        'Actions'
                    ], rows: rows })) })] }));
}
export async function renderExamplePackageAdminCreatePage() {
    const settings = await getExamplePackageSettings();
    return (_jsx(ModuleLayout, { title: "Create Admin Record", description: "Creates a row in module table using module action.", children: _jsx(ModuleCard, { title: "Create", children: _jsxs("form", { action: createExamplePackageItemAdminAction, children: [_jsx(FieldLabel, { htmlFor: "title", label: "Title" }), _jsx(TextInput, { id: "title", name: "title", required: true, maxLength: 120, placeholder: "Campaign launch checklist" }), _jsx(FieldLabel, { htmlFor: "description", label: "Description" }), _jsx(TextArea, { id: "description", name: "description", rows: 4, placeholder: "Optional details for dashboard and API." }), _jsx(FieldLabel, { htmlFor: "status", label: "Status" }), statusOptions(settings.defaultStatus), _jsx(FieldLabel, { htmlFor: "priority", label: "Priority (1-5)" }), _jsx(TextInput, { id: "priority", name: "priority", type: "number", min: 1, max: 5, defaultValue: 3 }), visibilityCheckbox(false), _jsxs(FormActions, { children: [_jsx(SubmitButton, { label: "Create" }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, label: "Back" })] })] }) }) }));
}
export async function renderExamplePackageAdminEditPage(itemId) {
    const item = await getExamplePackageItemById(itemId);
    if (!item) {
        return (_jsx(ModuleLayout, { title: "Record Not Found", description: `No record for id ${itemId}.`, children: _jsx(ModuleCard, { title: "Missing record", children: _jsx(ActionLink, { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, label: "Back to module home" }) }) }));
    }
    return (_jsxs(ModuleLayout, { title: `Edit Record #${item.id}`, description: "Update values in module-owned table.", children: [_jsx(ModuleCard, { title: "Edit", children: _jsxs("form", { action: updateExamplePackageItemAdminAction, children: [_jsx("input", { type: "hidden", name: "itemId", value: item.id }), _jsx(FieldLabel, { htmlFor: "title", label: "Title" }), _jsx(TextInput, { id: "title", name: "title", required: true, maxLength: 120, defaultValue: item.title }), _jsx(FieldLabel, { htmlFor: "description", label: "Description" }), _jsx(TextArea, { id: "description", name: "description", rows: 4, defaultValue: item.description || '' }), _jsx(FieldLabel, { htmlFor: "status", label: "Status" }), statusOptions(item.status), _jsx(FieldLabel, { htmlFor: "priority", label: "Priority (1-5)" }), _jsx(TextInput, { id: "priority", name: "priority", type: "number", min: 1, max: 5, defaultValue: item.priority }), visibilityCheckbox(item.isPublic), _jsxs(FormActions, { children: [_jsx(SubmitButton, { label: "Save" }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, label: "Back" })] })] }) }), _jsx(ModuleCard, { title: "Danger Zone", description: "Delete this record permanently.", children: _jsxs("form", { action: deleteExamplePackageItemAdminAction, children: [_jsx("input", { type: "hidden", name: "itemId", value: item.id }), _jsxs(FormActions, { children: [_jsx(SubmitButton, { label: "Delete", tone: "danger" }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, label: "Cancel" })] })] }) })] }));
}
export async function renderExamplePackageAdminSettingsPage() {
    const settings = await getExamplePackageSettings();
    return (_jsx(ModuleLayout, { title: "Module Settings", description: "Settings are persisted in mod_example_package_settings.", children: _jsx(ModuleCard, { title: "Update Settings", children: _jsxs("form", { action: updateExamplePackageSettingsAdminAction, children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", name: "allowDashboardCreate", value: "true", defaultChecked: settings.allowDashboardCreate }), ' ', "Allow dashboard users to create records"] }), _jsx(FieldLabel, { htmlFor: "apiWriteMode", label: "API write mode" }), _jsxs(SelectInput, { id: "apiWriteMode", name: "apiWriteMode", defaultValue: settings.apiWriteMode, children: [_jsx("option", { value: "authenticated", children: "authenticated users" }), _jsx("option", { value: "admin", children: "admins only" })] }), _jsx(FieldLabel, { htmlFor: "defaultStatus", label: "Default status" }), _jsxs(SelectInput, { id: "defaultStatus", name: "defaultStatus", defaultValue: settings.defaultStatus, children: [_jsx("option", { value: "draft", children: "draft" }), _jsx("option", { value: "active", children: "active" }), _jsx("option", { value: "archived", children: "archived" })] }), _jsxs(FormActions, { children: [_jsx(SubmitButton, { label: "Save Settings" }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, label: "Back" })] })] }) }) }));
}
export function parseExamplePackageAdminItemId(value) {
    return toPositiveInt(value);
}
