import { eq } from 'drizzle-orm';
import { client, db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';
import { getModuleManifest } from '@/lib/modules/registry';

const moduleId = process.env.MODULE_ID?.trim() || 'ops.diagnostics';
const action = (process.env.MODULE_ACTION ?? process.argv[2] ?? 'enable').toLowerCase();
const now = new Date();

function inferModuleInstallMode(value: string) {
  return value.startsWith('core.') || value.startsWith('ops.') ? 'core' : 'plugin';
}

function resolveModuleTarget() {
  const manifest = getModuleManifest(moduleId);
  if (!manifest) {
    throw new Error(`MODULE_ID "${moduleId}" is not present in the module registry.`);
  }

  return {
    moduleId: manifest.moduleId,
    moduleVersion: process.env.MODULE_VERSION?.trim() || manifest.version,
    installMode: inferModuleInstallMode(manifest.moduleId)
  };
}

async function enableModule() {
  const target = resolveModuleTarget();
  await db
    .insert(appModules)
    .values({
      moduleId: target.moduleId,
      version: target.moduleVersion,
      status: 'enabled',
      installMode: target.installMode,
      installedAt: now,
      enabledAt: now,
      disabledAt: null,
      uninstalledAt: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [appModules.moduleId],
      set: {
        version: target.moduleVersion,
        status: 'enabled',
        installMode: target.installMode,
        enabledAt: now,
        disabledAt: null,
        uninstalledAt: null,
        updatedAt: now
      }
    });

  console.log(
    JSON.stringify(
      {
        action: 'enable',
        moduleId: target.moduleId,
        moduleVersion: target.moduleVersion,
        installMode: target.installMode
      },
      null,
      2
    )
  );
}

async function disableModule() {
  const target = resolveModuleTarget();

  await db
    .update(appModules)
    .set({
      status: 'disabled',
      disabledAt: now,
      uninstalledAt: null,
      updatedAt: now
    })
    .where(eq(appModules.moduleId, target.moduleId));

  console.log(
    JSON.stringify(
      {
        action: 'disable',
        moduleId: target.moduleId,
        installMode: target.installMode
      },
      null,
      2
    )
  );
}

async function run() {
  if (action === 'enable') {
    await enableModule();
    return;
  }

  if (action === 'disable') {
    await disableModule();
    return;
  }

  throw new Error(`Unknown action: ${action}`);
}

run()
  .catch((error) => {
    console.error('Ops module toggle failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
