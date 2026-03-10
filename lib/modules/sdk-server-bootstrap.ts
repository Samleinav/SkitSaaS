import 'server-only';

import { revalidatePath as nextRevalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  configureAuth,
  configureBuildFormDbValidation,
  configureDatabase,
  configureEventEmitter,
  configureModuleConfig,
  configureNotifications,
  configureRevalidation,
  configureSubscriptionFeatures
} from '@skitsaas/sdk/server';
import {
  getAppConfigValueFromDb,
  inferAppConfigIsSecret,
  trimToNull
} from '@/lib/config/app-config';
import {
  deleteAppConfigEntry,
  upsertAppConfigEntry
} from '@/lib/config/app-config-writes';
import { adminDb, db } from '@/lib/db/drizzle';
import { resolveBuildFormDbLookup } from '@/lib/forms/db-registry';
import {
  configureBuildFormValidationObservability,
  createBuildFormSysActivityObserver
} from '@/lib/forms/observability';
import * as rootSchema from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { setSession } from '@/lib/auth/session';
import { createSystemNotification } from '@/lib/notifications/service';
import { quotaAdapter } from '@/lib/quota/service';
import { and, eq, isNull } from 'drizzle-orm';

let bootstrapped = false;
const ADMIN_ROLES = new Set(['admin']);
const DRIZZLE_TABLE_SYMBOL = Symbol.for('drizzle:IsDrizzleTable');
const DRIZZLE_TABLE_NAME_SYMBOL = Symbol.for('drizzle:Name');

const CORE_TABLE_ALIASES: Record<string, string> = {
  user: 'users',
  users: 'users',
  subscription: 'subscription_assignments',
  subscriptions: 'subscription_assignments',
  logs: 'sys_activity_logs',
  orders: 'payment_orders',
  payments: 'payment_orders',
  notification: 'system_notifications',
  notifications: 'system_notifications',
  notification_recipient: 'system_notification_recipients',
  notification_recipients: 'system_notification_recipients'
};

function normalizeTableId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/-/g, '_');
}

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function isDrizzleTable(value: unknown): value is Record<string | symbol, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Boolean((value as Record<string | symbol, unknown>)[DRIZZLE_TABLE_SYMBOL]);
}

function readDrizzleTableName(value: Record<string | symbol, unknown>) {
  const tableName = value[DRIZZLE_TABLE_NAME_SYMBOL];
  return typeof tableName === 'string' ? tableName : '';
}

function buildRootTableRegistry() {
  const tableRegistry = new Map<string, unknown>();

  for (const [exportName, exportValue] of Object.entries(rootSchema)) {
    if (!isDrizzleTable(exportValue)) {
      continue;
    }

    const exportKey = normalizeTableId(exportName);
    if (exportKey) {
      tableRegistry.set(exportKey, exportValue);
    }

    const snakeExportKey = normalizeTableId(toSnakeCase(exportName));
    if (snakeExportKey) {
      tableRegistry.set(snakeExportKey, exportValue);
    }

    const tableName = normalizeTableId(readDrizzleTableName(exportValue));
    if (tableName) {
      tableRegistry.set(tableName, exportValue);
    }
  }

  for (const [alias, targetKey] of Object.entries(CORE_TABLE_ALIASES)) {
    const normalizedAlias = normalizeTableId(alias);
    const normalizedTarget = normalizeTableId(targetKey);
    if (!normalizedAlias || !normalizedTarget) {
      continue;
    }

    const resolved = tableRegistry.get(normalizedTarget);
    if (resolved) {
      tableRegistry.set(normalizedAlias, resolved);
    }
  }

  return tableRegistry;
}

const ROOT_TABLE_REGISTRY = buildRootTableRegistry();
const ROOT_TABLE_KEYS = Array.from(ROOT_TABLE_REGISTRY.keys()).sort();

async function requireDashboardUser() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/login');
  }

  return currentUser;
}

function normalizeRole(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

async function requireAdminDashboardUser() {
  const currentUser = await requireDashboardUser();
  const role = normalizeRole((currentUser as { role?: unknown }).role);
  if (!ADMIN_ROLES.has(role)) {
    redirect('/dashboard');
  }

  return currentUser;
}

async function setModuleConfigValue(
  namespace: string,
  configKey: string,
  configValue: string | null
) {
  const normalizedNamespace = namespace.trim();
  const normalizedConfigKey = configKey.trim();
  if (!normalizedNamespace || !normalizedConfigKey) {
    return;
  }

  const normalizedConfigValue = trimToNull(configValue);
  if (!normalizedConfigValue) {
    await deleteAppConfigEntry({
      namespace: normalizedNamespace,
      configKey: normalizedConfigKey
    });
    return;
  }

  await upsertAppConfigEntry({
    namespace: normalizedNamespace,
    configKey: normalizedConfigKey,
    configValue: normalizedConfigValue,
    isSecret: inferAppConfigIsSecret(normalizedConfigKey)
  });
}

export function bootstrapModuleSdkServer() {
  if (bootstrapped) {
    return;
  }

  configureEventEmitter({
    emitEvent,
    emitEventAsync
  });

  configureModuleConfig({
    getConfigValue: getAppConfigValueFromDb,
    setConfigValue: setModuleConfigValue
  });

  configureNotifications({
    createNotification: createSystemNotification
  });

  configureDatabase({
    getDb: () => db,
    getAdminDb: () => adminDb,
    getTable: (tableId) => ROOT_TABLE_REGISTRY.get(normalizeTableId(tableId)) ?? null,
    listTables: () => ROOT_TABLE_KEYS
  });

  configureAuth({
    getUser,
    requireUser: requireDashboardUser,
    requireAdmin: requireAdminDashboardUser,
    setSessionForUser: async (userId, options) => {
      const [userRecord] = await db
        .select()
        .from(rootSchema.users)
        .where(
          and(
            eq(rootSchema.users.id, userId),
            isNull(rootSchema.users.deletedAt),
            eq(rootSchema.users.accountStatus, 'active')
          )
        )
        .limit(1);

      if (!userRecord) {
        throw new Error(`Cannot create session for missing user id ${userId}.`);
      }

      await setSession(userRecord, options);
    }
  });

  configureRevalidation({
    revalidatePath: nextRevalidatePath
  });

  configureBuildFormDbValidation({
    lookup: resolveBuildFormDbLookup
  });

  configureBuildFormValidationObservability(
    createBuildFormSysActivityObserver()
  );

  configureSubscriptionFeatures(quotaAdapter);

  bootstrapped = true;
}

bootstrapModuleSdkServer();
