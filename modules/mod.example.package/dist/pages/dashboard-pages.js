import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_PACKAGE_DASHBOARD_ALIAS } from '../constants.js';
import { createExamplePackageItemDashboardAction } from '../actions.js';
import { getEditableExamplePackageItemForUser, getExamplePackageSettings, listExamplePackageItemsForUser } from '../data.js';
import { ActionLink, Badge, DataTable, FieldLabel, FormActions, InfoText, ModuleCard, ModuleLayout, SubmitButton, TextArea, TextInput } from '../ui/module-ui.js';
function formatDate(value) {
    return value.toISOString().replace('T', ' ').slice(0, 16);
}
export async function renderExamplePackageDashboardHomePage() {
    const user = await getUser();
    if (!user) {
        return null;
    }
    const [settings, items] = await Promise.all([
        getExamplePackageSettings(),
        listExamplePackageItemsForUser({ userId: user.id, limit: 120 })
    ]);
    const rows = items.map((item) => [
        _jsx("code", { children: item.id }, `id-${item.id}`),
        _jsx("a", { href: `${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/items/${item.id}`, children: item.title }, `title-${item.id}`),
        _jsx(Badge, { value: item.status }, `status-${item.id}`),
        String(item.priority),
        item.isPublic ? 'public' : 'private',
        _jsx("code", { children: formatDate(item.updatedAt) }, `updated-${item.id}`)
    ]);
    return (_jsxs(ModuleLayout, { title: "Example Package Dashboard", description: "Dashboard view for source-package module.", children: [_jsxs(ModuleCard, { title: "Visibility", children: [_jsxs(InfoText, { children: ["Visible records: ", items.length] }), _jsxs(InfoText, { children: ["Dashboard create: ", settings.allowDashboardCreate ? 'enabled' : 'disabled'] }), settings.allowDashboardCreate ? (_jsx(ActionLink, { href: `${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`, label: "Create Record" })) : null] }), _jsx(ModuleCard, { title: "Records", description: "Shows public records and records you own.", children: rows.length === 0 ? (_jsx(InfoText, { children: "No records visible." })) : (_jsx(DataTable, { headers: ['Id', 'Title', 'Status', 'Priority', 'Visibility', 'Updated'], rows: rows })) })] }));
}
export async function renderExamplePackageDashboardCreatePage() {
    const [user, settings] = await Promise.all([getUser(), getExamplePackageSettings()]);
    if (!user) {
        return null;
    }
    return (_jsx(ModuleLayout, { title: "Dashboard Create", description: "Create a module record from dashboard.", children: _jsx(ModuleCard, { title: "Create Record", children: !settings.allowDashboardCreate ? (_jsx(InfoText, { children: "Dashboard create is disabled by module settings." })) : (_jsxs("form", { action: createExamplePackageItemDashboardAction, children: [_jsx(FieldLabel, { htmlFor: "title", label: "Title" }), _jsx(TextInput, { id: "title", name: "title", required: true, maxLength: 120 }), _jsx(FieldLabel, { htmlFor: "description", label: "Description" }), _jsx(TextArea, { id: "description", name: "description", rows: 3 }), _jsx(FieldLabel, { htmlFor: "priority", label: "Priority (1-5)" }), _jsx(TextInput, { id: "priority", name: "priority", type: "number", min: 1, max: 5, defaultValue: 3 }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", name: "isPublic", value: "true" }), " Publish to public API list"] }), _jsxs(FormActions, { children: [_jsx(SubmitButton, { label: "Create" }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS, label: "Back" })] })] })) }) }));
}
export async function renderExamplePackageDashboardItemPage(itemId) {
    const user = await getUser();
    if (!user) {
        return null;
    }
    const item = await getEditableExamplePackageItemForUser({ itemId, userId: user.id });
    if (!item) {
        return (_jsx(ModuleLayout, { title: "Record Not Available", description: "The record does not exist or is not owned by your user.", children: _jsx(ModuleCard, { title: "Unavailable", children: _jsx(ActionLink, { href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS, label: "Back to module" }) }) }));
    }
    return (_jsx(ModuleLayout, { title: item.title, description: "Owner-only dashboard detail view.", children: _jsxs(ModuleCard, { title: `Record #${item.id}`, children: [_jsxs(InfoText, { children: ["Status: ", _jsx(Badge, { value: item.status })] }), _jsxs(InfoText, { children: ["Priority: ", item.priority] }), _jsxs(InfoText, { children: ["Visibility: ", item.isPublic ? 'public' : 'private'] }), _jsxs(InfoText, { children: ["Description: ", item.description || '-'] }), _jsxs(InfoText, { children: ["Updated: ", formatDate(item.updatedAt)] }), _jsx(ActionLink, { href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS, label: "Back to module" })] }) }));
}
