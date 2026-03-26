import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { TemplateBuildForm, composeBuildFormDefinition } from '@skitsaas/sdk';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_PACKAGE_DASHBOARD_ALIAS } from '../constants.js';
import { createExamplePackageItemDashboardAction } from '../actions.js';
import { getEditableExamplePackageItemForUser, getExamplePackageSettings, listExamplePackageItemsForUser } from '../data.js';
import { createExamplePackageDashboardItemFormDefinition } from '../forms.js';
import { ActionLink, Badge, InfoText, ModuleCard, ModuleLayout } from '../ui/module-ui.js';
import { ExamplePackageDashboardItemsDataTable } from '../module-data-tables.js';
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
    const tableItems = items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        visibilityLabel: item.isPublic ? 'public' : 'private',
        canOpenDetail: item.ownerUserId === user.id,
        updatedAt: item.updatedAt.getTime(),
        updatedAtLabel: formatDate(item.updatedAt)
    }));
    return (_jsxs(ModuleLayout, { title: "Example Package Dashboard", description: "Dashboard view for the source-package example module.", children: [_jsxs(ModuleCard, { title: "Visibility", children: [_jsxs(InfoText, { children: ["Visible records: ", items.length] }), _jsxs(InfoText, { children: ["Dashboard create: ", settings.allowDashboardCreate ? 'enabled' : 'disabled'] }), settings.allowDashboardCreate ? (_jsx(ActionLink, { href: `${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`, label: "Create Record" })) : null] }), _jsx(ModuleCard, { title: "Records", description: "Remote SDK DataTable showing public records and records you own.", children: tableItems.length === 0 ? (_jsx(InfoText, { children: "No records visible." })) : (_jsx(ExamplePackageDashboardItemsDataTable, { items: tableItems, dashboardAlias: EXAMPLE_PACKAGE_DASHBOARD_ALIAS })) })] }));
}
export async function renderExamplePackageDashboardCreatePage() {
    const [user, settings] = await Promise.all([getUser(), getExamplePackageSettings()]);
    if (!user) {
        return null;
    }
    const createForm = composeBuildFormDefinition(createExamplePackageDashboardItemFormDefinition(), {
        request: {
            action: createExamplePackageItemDashboardAction,
            method: 'post'
        },
        submit: {
            idleLabel: 'Create',
            pendingLabel: 'Creating...',
            successLabel: 'Created',
            align: 'start',
            secondaryActions: [
                {
                    label: 'Back',
                    href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS
                }
            ]
        },
        values: {
            priority: 3,
            isPublic: false
        }
    });
    return (_jsx(ModuleLayout, { title: "Dashboard Create", description: "Create a module record from dashboard with SDK TemplateBuildForm.", children: _jsx(ModuleCard, { title: "Create Record", children: !settings.allowDashboardCreate ? (_jsx(InfoText, { children: "Dashboard create is disabled by module settings." })) : (_jsx(TemplateBuildForm, { definition: createForm, area: "dashboard", route: `${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`, moduleId: "mod.example.package", slot: "mod.example.package.dashboard.create.form" })) }) }));
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
