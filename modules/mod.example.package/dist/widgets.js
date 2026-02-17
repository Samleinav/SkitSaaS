import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_PACKAGE_ADMIN_ALIAS, EXAMPLE_PACKAGE_DASHBOARD_ALIAS } from './constants.js';
import { getExamplePackageSettings, listExamplePackageItemsForAdmin } from './data.js';
import { ModuleCard, Badge } from './ui/module-ui.js';
export async function ExamplePackageAdminWidget() {
    const [settings, items] = await Promise.all([
        getExamplePackageSettings(),
        listExamplePackageItemsForAdmin(10)
    ]);
    return (_jsxs(ModuleCard, { title: "Example Package Snapshot", description: "Source-package module widget (admin).", children: [_jsxs("p", { children: ["Total records: ", items.length] }), _jsxs("p", { children: ["API write mode: ", settings.apiWriteMode] }), _jsxs("p", { children: ["Dashboard create: ", settings.allowDashboardCreate ? 'enabled' : 'disabled'] }), _jsx("a", { href: EXAMPLE_PACKAGE_ADMIN_ALIAS, children: "Open admin module" })] }));
}
export async function ExamplePackageDashboardWidget() {
    const user = await getUser();
    const items = await listExamplePackageItemsForAdmin(6);
    return (_jsxs(ModuleCard, { title: "Example Package", description: "Source-package module widget (dashboard).", children: [_jsx("p", { children: user ? `Hello user #${user.id}` : 'User session unavailable.' }), _jsxs("p", { children: ["Recent records: ", items.length] }), _jsxs("p", { children: ["Sample status: ", _jsx(Badge, { value: "active" })] }), _jsx("a", { href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS, children: "Open dashboard module" })] }));
}
