import React from 'react';
import { getUser } from '@skitsaas/sdk/server';
import {
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS
} from './constants';
import {
  getExamplePackageSettings,
  listExamplePackageItemsForAdmin
} from './data';
import { ModuleCard, Badge } from './ui/module-ui.jsx';

export async function ExamplePackageAdminWidget() {
  const [settings, items] = await Promise.all([
    getExamplePackageSettings(),
    listExamplePackageItemsForAdmin(10)
  ]);

  return (
    <ModuleCard
      title="Example Package Snapshot"
      description="Source-package module widget (admin)."
    >
      <p>Total records: {items.length}</p>
      <p>API write mode: {settings.apiWriteMode}</p>
      <p>
        Dashboard create: {settings.allowDashboardCreate ? 'enabled' : 'disabled'}
      </p>
      <a href={EXAMPLE_PACKAGE_ADMIN_ALIAS}>Open admin module</a>
    </ModuleCard>
  );
}

export async function ExamplePackageDashboardWidget() {
  const user = await getUser();
  const items = await listExamplePackageItemsForAdmin(6);

  return (
    <ModuleCard
      title="Example Package"
      description="Source-package module widget (dashboard)."
    >
      <p>{user ? `Hello user #${user.id}` : 'User session unavailable.'}</p>
      <p>Recent records: {items.length}</p>
      <p>
        Sample status: <Badge value="active" />
      </p>
      <a href={EXAMPLE_PACKAGE_DASHBOARD_ALIAS}>Open dashboard module</a>
    </ModuleCard>
  );
}
