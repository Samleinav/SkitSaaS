import { client, db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';
import { getAllModuleManifests } from '@/lib/modules/registry';
import {
  buildEnabledModuleNavItems,
  type ModuleRuntimeRow,
  type ModuleRuntimeStatus
} from '@/lib/modules/runtime';
import type { ModuleManifest } from '@/lib/modules/manifest';

const MODULE_STATUSES = new Set<ModuleRuntimeStatus>([
  'installed',
  'enabled',
  'disabled',
  'uninstalled'
]);

function normalizeStatus(value: string): ModuleRuntimeStatus {
  if (MODULE_STATUSES.has(value as ModuleRuntimeStatus)) {
    return value as ModuleRuntimeStatus;
  }

  return 'uninstalled';
}

function hasManifestSurface(manifest: ModuleManifest) {
  return Boolean(
    manifest.adminNavItems?.length ||
      manifest.dashboardNavItems?.length ||
      manifest.adminDashboardWidgets?.length ||
      manifest.dashboardWidgets?.length ||
      manifest.adminPage ||
      manifest.dashboardPage ||
      manifest.apiHandler
  );
}

const manifests = getAllModuleManifests();
const manifestById = new Map(
  manifests.map((manifest) => [manifest.moduleId, manifest])
);

async function run() {
  const rows = await db
    .select({
      moduleId: appModules.moduleId,
      status: appModules.status,
      version: appModules.version,
      installMode: appModules.installMode
    })
    .from(appModules);

  const runtimeRows: ModuleRuntimeRow[] = rows.map((row) => ({
    ...row,
    status: normalizeStatus(row.status)
  }));

  const invalidStatusRows = rows
    .filter((row) => !MODULE_STATUSES.has(row.status as ModuleRuntimeStatus))
    .map((row) => ({ moduleId: row.moduleId, status: row.status }));

  const enabledRows = runtimeRows.filter((row) => row.status === 'enabled');
  const missingManifests = enabledRows.filter(
    (row) => !manifestById.has(row.moduleId)
  );

  const enabledWithoutSurface = enabledRows
    .map((row) => manifestById.get(row.moduleId))
    .filter((manifest) => manifest && !hasManifestSurface(manifest))
    .map((manifest) => manifest!.moduleId);

  const adminNavItems = buildEnabledModuleNavItems({
    manifests,
    runtimeRows,
    area: 'admin'
  });
  const dashboardNavItems = buildEnabledModuleNavItems({
    manifests,
    runtimeRows,
    area: 'dashboard'
  });

  const report = {
    generatedAt: new Date().toISOString(),
    runtimeRowCount: runtimeRows.length,
    enabledCount: enabledRows.length,
    invalidStatusRows,
    missingManifests,
    enabledWithoutSurface,
    adminNavItems,
    dashboardNavItems
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingManifests.length > 0 || invalidStatusRows.length > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error('Module runtime check failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
