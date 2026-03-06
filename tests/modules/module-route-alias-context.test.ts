import assert from 'node:assert/strict';
import test from 'node:test';
import { defineModule } from '../../lib/modules/manifest';
import { getAllModuleManifests, getModuleRegistry } from '../../lib/modules/registry';
import { resolveModulePageByPath } from '../../lib/modules/runtime';
import { featureFlags } from '../../lib/feature-flags';

test('resolveModulePageByPath passes matchedAlias to module page context', async () => {
  const runtimeFlags = featureFlags as unknown as {
    useAppModulesRuntime: boolean;
    useModuleDispatcherRoutes: boolean;
  };
  const originalRuntime = runtimeFlags.useAppModulesRuntime;
  const originalDispatcher = runtimeFlags.useModuleDispatcherRoutes;

  const manifest = defineModule({
    moduleId: 'mod.education.enrollment',
    version: '0.1.0',
    displayName: 'Enrollment Alias Context',
    dashboardRouteAliases: ['/dashboard/enrollment-reports'],
    dashboardPage: (context) => context.matchedAlias ?? 'missing'
  });
  const manifests = getAllModuleManifests();
  const registry = getModuleRegistry();
  const manifestIndex = manifests.findIndex(
    (entry) => entry.moduleId === manifest.moduleId
  );
  const originalManifest = manifestIndex >= 0 ? manifests[manifestIndex] : null;

  if (manifestIndex >= 0) {
    manifests[manifestIndex] = manifest;
  } else {
    manifests.push(manifest);
  }
  registry.set(manifest.moduleId, manifest);

  runtimeFlags.useAppModulesRuntime = true;
  runtimeFlags.useModuleDispatcherRoutes = true;

  try {
    const result = await resolveModulePageByPath({
      area: 'dashboard',
      path: '/dashboard/enrollment-reports'
    });

    assert.equal(result, '/dashboard/enrollment-reports');
  } finally {
    if (manifestIndex >= 0 && originalManifest) {
      manifests[manifestIndex] = originalManifest;
      registry.set(originalManifest.moduleId, originalManifest);
    } else {
      manifests.pop();
      registry.delete(manifest.moduleId);
    }
    runtimeFlags.useAppModulesRuntime = originalRuntime;
    runtimeFlags.useModuleDispatcherRoutes = originalDispatcher;
  }
});
