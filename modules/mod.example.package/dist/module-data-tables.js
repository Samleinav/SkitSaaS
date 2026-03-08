'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { DataTable, buildTableAction, buildTableColumn, defineBuildTable } from '@skitsaas/sdk';
import { EXAMPLE_PACKAGE_API_BASE } from './constants.js';
import { Badge } from './ui/module-ui.js';
function buildAdminItemsTableDefinition({ items, adminAlias }) {
    return defineBuildTable({
        data: items,
        columns: [
            buildTableColumn.text({
                key: 'id',
                header: 'Id',
                sortable: true,
                cell: (item) => _jsx("code", { children: item.id })
            }),
            buildTableColumn.text({
                key: 'title',
                header: 'Title',
                sortable: true,
                searchable: true,
                cell: (item) => _jsx("strong", { children: item.title })
            }),
            buildTableColumn.custom({
                key: 'status',
                header: 'Status',
                cell: (item) => _jsx(Badge, { value: item.status })
            }),
            buildTableColumn.text({
                key: 'priority',
                header: 'Priority'
            }),
            buildTableColumn.text({
                key: 'visibilityLabel',
                header: 'Visibility'
            }),
            buildTableColumn.text({
                key: 'ownerLabel',
                header: 'Owner'
            }),
            buildTableColumn.text({
                key: 'updatedAt',
                header: 'Updated',
                sortable: true,
                cell: (item) => _jsx("code", { children: item.updatedAtLabel })
            }),
            buildTableColumn.actions({
                key: 'actions',
                header: 'Actions',
                actions: (item) => [
                    buildTableAction.link({
                        label: 'Edit',
                        href: `${adminAlias}/edit/${item.id}`
                    }),
                    buildTableAction.request({
                        label: 'Delete',
                        request: {
                            url: `${EXAMPLE_PACKAGE_API_BASE}/items/${item.id}`,
                            method: 'DELETE',
                            reload: true,
                            successMessage: 'Record deleted.'
                        },
                        confirm: {
                            title: 'Delete record?',
                            description: `This removes "${item.title}".`,
                            confirmLabel: 'Delete',
                            cancelLabel: 'Cancel'
                        }
                    })
                ]
            })
        ],
        source: {
            url: `${EXAMPLE_PACKAGE_API_BASE}/items?scope=admin`,
            debounceMs: 250
        },
        toolbar: {
            search: {
                enabled: true,
                placeholder: 'Search records',
                columns: ['title', 'ownerLabel']
            }
        },
        pagination: {
            pageSize: 10
        }
    });
}
function buildDashboardItemsTableDefinition({ items, dashboardAlias }) {
    return defineBuildTable({
        data: items,
        columns: [
            buildTableColumn.text({
                key: 'id',
                header: 'Id',
                sortable: true,
                cell: (item) => _jsx("code", { children: item.id })
            }),
            buildTableColumn.custom({
                key: 'title',
                header: 'Title',
                searchable: true,
                cell: (item) => (_jsx("a", { href: `${dashboardAlias}/items/${item.id}`, children: item.title }))
            }),
            buildTableColumn.custom({
                key: 'status',
                header: 'Status',
                cell: (item) => _jsx(Badge, { value: item.status })
            }),
            buildTableColumn.text({
                key: 'priority',
                header: 'Priority'
            }),
            buildTableColumn.text({
                key: 'visibilityLabel',
                header: 'Visibility'
            }),
            buildTableColumn.text({
                key: 'updatedAt',
                header: 'Updated',
                sortable: true,
                cell: (item) => _jsx("code", { children: item.updatedAtLabel })
            })
        ],
        source: {
            url: `${EXAMPLE_PACKAGE_API_BASE}/items`,
            debounceMs: 250
        },
        toolbar: {
            search: {
                enabled: true,
                placeholder: 'Search records',
                columns: ['title']
            }
        },
        pagination: {
            pageSize: 10
        }
    });
}
export function ExamplePackageAdminItemsDataTable({ items, adminAlias }) {
    return (_jsx(DataTable, { definition: buildAdminItemsTableDefinition({
            items,
            adminAlias
        }), tableClassName: "min-w-[960px]" }));
}
export function ExamplePackageDashboardItemsDataTable({ items, dashboardAlias }) {
    return (_jsx(DataTable, { definition: buildDashboardItemsTableDefinition({
            items,
            dashboardAlias
        }), tableClassName: "min-w-[760px]" }));
}
