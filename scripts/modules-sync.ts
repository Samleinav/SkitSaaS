import { eq, inArray } from 'drizzle-orm';
import { client, db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';
import { getAllModuleManifests } from '@/lib/modules/registry';

type ModuleStatus = 'installed' | 'enabled' | 'disabled' | 'uninstalled';

export type ModuleSyncManifest = {
  moduleId: string;
  version: string;
};

export type ModuleSyncRow = {
  moduleId: string;
  status: ModuleStatus;
  version: string;
  installMode: string;
  installedAt: Date | null;
  enabledAt: Date | null;
  disabledAt: Date | null;
  uninstalledAt: Date | null;
};

export type ModuleSyncUpdate = {
  moduleId: string;
  set: Partial<ModuleSyncRow> & { updatedAt?: Date };
};

export type ModuleSyncPlan = {
  inserts: Array<{
    moduleId: string;
    version: string;
    status: ModuleStatus;
    installMode: string;
    installedAt: Date | null;
    enabledAt: Date | null;
  }>;
  updates: ModuleSyncUpdate[];
};

export type ModuleSyncOptions = {
  enableNew?: boolean;
  now?: Date;
  includeCore?: boolean;
  timeoutMs?: number;
};

function inferInstallMode(moduleId: string) {
  if (moduleId.startsWith('core.') || moduleId.startsWith('ops.')) {
    return 'core';
  }

  return 'plugin';
}

function shouldIncludeModule(moduleId: string, includeCore: boolean) {
  if (includeCore) {
    return true;
  }

  return !(moduleId.startsWith('core.') || moduleId.startsWith('ops.'));
}

function normalizeModuleStatus(value: string): ModuleStatus {
  if (
    value === 'installed' ||
    value === 'enabled' ||
    value === 'disabled' ||
    value === 'uninstalled'
  ) {
    return value;
  }

  return 'installed';
}

const DEFAULT_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `modules:sync timed out after ${timeoutMs}ms while ${label}.`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }) as Promise<T>;
}

function resolveTimeoutMs(options?: ModuleSyncOptions) {
  if (options?.timeoutMs !== undefined) {
    return options.timeoutMs;
  }

  const raw = process.env.MODULES_SYNC_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(0, Math.floor(value));
}

export function buildModulesSyncPlan({
  manifests,
  existingRows,
  options
}: {
  manifests: ModuleSyncManifest[];
  existingRows: ModuleSyncRow[];
  options?: ModuleSyncOptions;
}): ModuleSyncPlan {
  const enableNew = options?.enableNew ?? true;
  const includeCore = options?.includeCore ?? true;
  const now = options?.now ?? new Date();

  const byId = new Map(existingRows.map((row) => [row.moduleId, row]));
  const inserts: ModuleSyncPlan['inserts'] = [];
  const updates: ModuleSyncPlan['updates'] = [];

  for (const manifest of manifests) {
    if (!shouldIncludeModule(manifest.moduleId, includeCore)) {
      continue;
    }

    const existing = byId.get(manifest.moduleId);
    if (!existing) {
      const status: ModuleStatus = enableNew ? 'enabled' : 'installed';
      const installMode = inferInstallMode(manifest.moduleId);
      inserts.push({
        moduleId: manifest.moduleId,
        version: manifest.version,
        status,
        installMode,
        installedAt: now,
        enabledAt: status === 'enabled' ? now : null
      });
      continue;
    }

    const set: ModuleSyncUpdate['set'] = {};

    if (existing.version !== manifest.version) {
      set.version = manifest.version;
    }

    if (!existing.installedAt) {
      set.installedAt = now;
    }

    if (existing.status === 'enabled' && !existing.enabledAt) {
      set.enabledAt = now;
    }

    if (existing.status === 'disabled' && !existing.disabledAt) {
      set.disabledAt = now;
    }

    if (existing.status === 'uninstalled' && !existing.uninstalledAt) {
      set.uninstalledAt = now;
    }

    if (Object.keys(set).length > 0) {
      updates.push({
        moduleId: manifest.moduleId,
        set: {
          ...set,
          updatedAt: now
        }
      });
    }
  }

  return { inserts, updates };
}

async function loadExistingRows(moduleIds: string[]) {
  if (!moduleIds.length) {
    return [] as ModuleSyncRow[];
  }

  const rows = await db
    .select({
      moduleId: appModules.moduleId,
      status: appModules.status,
      version: appModules.version,
      installMode: appModules.installMode,
      installedAt: appModules.installedAt,
      enabledAt: appModules.enabledAt,
      disabledAt: appModules.disabledAt,
      uninstalledAt: appModules.uninstalledAt
    })
    .from(appModules)
    .where(inArray(appModules.moduleId, moduleIds));

  return rows.map((row) => ({
    ...row,
    status: normalizeModuleStatus(row.status)
  }));
}

export async function runModulesSync(options: ModuleSyncOptions = {}) {
  const timeoutMs = resolveTimeoutMs(options);
  const includeCore = options.includeCore ?? true;
  const manifests = getAllModuleManifests()
    .filter((manifest) =>
      shouldIncludeModule(manifest.moduleId, includeCore)
    )
    .map((manifest) => ({
      moduleId: manifest.moduleId,
      version: manifest.version
    }));

  const moduleIds = manifests.map((manifest) => manifest.moduleId);
  const existingRows = await withTimeout(
    loadExistingRows(moduleIds),
    timeoutMs,
    'loading module state'
  );
  const plan = buildModulesSyncPlan({
    manifests,
    existingRows,
    options
  });

  if (plan.inserts.length) {
    await withTimeout(
      db.insert(appModules).values(
        plan.inserts.map((entry) => ({
          moduleId: entry.moduleId,
          version: entry.version,
          status: entry.status,
          installMode: entry.installMode,
          installedAt: entry.installedAt ?? undefined,
          enabledAt: entry.enabledAt ?? undefined
        }))
      ),
      timeoutMs,
      'inserting new modules'
    );
  }

  for (const update of plan.updates) {
    await withTimeout(
      db
        .update(appModules)
        .set(update.set)
        .where(eq(appModules.moduleId, update.moduleId)),
      timeoutMs,
      `updating ${update.moduleId}`
    );
  }

  return {
    inserted: plan.inserts.length,
    updated: plan.updates.length,
    total: manifests.length
  };
}

function parseBooleanArg(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

async function main() {
  let enableNew = true;
  if (process.env.MODULES_SYNC_ENABLE_NEW !== undefined) {
    enableNew = parseBooleanArg(process.env.MODULES_SYNC_ENABLE_NEW);
  }
  if (process.argv.includes('--enable-new')) {
    enableNew = true;
  }
  if (process.argv.includes('--disable-new')) {
    enableNew = false;
  }

  let includeCore = true;
  if (process.env.MODULES_SYNC_INCLUDE_CORE !== undefined) {
    includeCore = parseBooleanArg(process.env.MODULES_SYNC_INCLUDE_CORE);
  }
  if (process.argv.includes('--include-core')) {
    includeCore = true;
  }
  if (process.argv.includes('--exclude-core')) {
    includeCore = false;
  }

  const timeoutMs = resolveTimeoutMs();
  console.log(
    `[modules-sync] starting enableNew=${enableNew} includeCore=${includeCore} timeoutMs=${timeoutMs}`
  );

  try {
    const result = await runModulesSync({
      enableNew,
      includeCore,
      timeoutMs
    });

    console.log(
      `[modules-sync] total=${result.total} inserted=${result.inserted} updated=${result.updated}`
    );
  } finally {
    try {
      await client.end({ timeout: 5 });
    } catch {
      // ignore shutdown errors
    }
  }
}

if (process.argv[1]?.includes('modules-sync.ts')) {
  main().catch((error) => {
    console.error('[modules-sync] failed', error);
    process.exit(1);
  });
}
