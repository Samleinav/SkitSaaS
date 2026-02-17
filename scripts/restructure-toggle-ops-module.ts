import { eq } from 'drizzle-orm';
import { client, db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';

const moduleId = process.env.MODULE_ID ?? 'ops.diagnostics';
const action = (process.env.MODULE_ACTION ?? process.argv[2] ?? 'enable').toLowerCase();
const now = new Date();

async function enableModule() {
  await db
    .insert(appModules)
    .values({
      moduleId,
      version: '1.0.0',
      status: 'enabled',
      installMode: 'plugin',
      installedAt: now,
      enabledAt: now,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [appModules.moduleId],
      set: {
        status: 'enabled',
        enabledAt: now,
        updatedAt: now
      }
    });

  console.log(JSON.stringify({ action: 'enable', moduleId }, null, 2));
}

async function disableModule() {
  await db
    .update(appModules)
    .set({
      status: 'disabled',
      disabledAt: now,
      updatedAt: now
    })
    .where(eq(appModules.moduleId, moduleId));

  console.log(JSON.stringify({ action: 'disable', moduleId }, null, 2));
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
