import {
  defineModule,
  validateModuleManifest,
  type ModuleManifest
} from './manifest';
import { EXTERNAL_MODULES } from './external.generated';
import { validateModuleRouteAliases } from './routes';

const MODULE_REGISTRY: ModuleManifest[] = [
  defineModule({
    moduleId: 'core.admin',
    version: '1.0.0',
    displayName: 'Core Admin'
  }),
  defineModule({
    moduleId: 'core.dashboard',
    version: '1.0.0',
    displayName: 'Core Dashboard'
  }),
  defineModule({
    moduleId: 'core.payments',
    version: '1.0.0',
    displayName: 'Core Payments'
  }),
  defineModule({
    moduleId: 'core.subscriptions',
    version: '1.0.0',
    displayName: 'Core Subscriptions'
  }),
  defineModule({
    moduleId: 'core.users',
    version: '1.0.0',
    displayName: 'Core Users'
  }),
  defineModule({
    moduleId: 'ops.diagnostics',
    version: '1.0.0',
    displayName: 'Ops Diagnostics',
    description: 'Runtime verification module for staging smoke checks.',
    adminNavItems: [
      {
        id: 'ops.diagnostics.nav',
        href: '/admin/modules/ops.diagnostics',
        label: 'Module Diagnostics',
        order: 999
      }
    ],
    adminPage: () => 'Module runtime diagnostics are enabled.'
  }),
  ...EXTERNAL_MODULES
];

function assertModuleRegistryIntegrity(manifests: ModuleManifest[]) {
  const errors: string[] = [];

  for (const manifest of manifests) {
    const manifestErrors = validateModuleManifest(manifest);
    for (const manifestError of manifestErrors) {
      errors.push(`${manifest.moduleId}: ${manifestError}`);
    }
  }

  const aliasErrors = validateModuleRouteAliases(manifests);
  for (const aliasError of aliasErrors) {
    errors.push(
      `${aliasError.moduleId}: ${aliasError.code} (${aliasError.path}) - ${aliasError.message}`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid module registry:\n- ${errors.join('\n- ')}`
    );
  }
}

assertModuleRegistryIntegrity(MODULE_REGISTRY);

const MODULE_REGISTRY_MAP = new Map(
  MODULE_REGISTRY.map((manifest) => [manifest.moduleId, manifest])
);

export function getModuleRegistry() {
  return MODULE_REGISTRY_MAP;
}

export function getAllModuleManifests() {
  return MODULE_REGISTRY;
}

export function getModuleManifest(moduleId: string) {
  return MODULE_REGISTRY_MAP.get(moduleId) ?? null;
}
