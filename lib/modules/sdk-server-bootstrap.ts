import 'server-only';

import { revalidatePath as nextRevalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  configureAuth,
  configureBuildFormDbValidation,
  configureBuildFormUiTemplateResolver,
  configureDatabase,
  configureEventEmitter,
  configureModuleConfig,
  configureNotifications,
  configureRevalidation,
  configureSubscriptionFeatures,
  configureUserRoles,
  configureUserContext,
} from '@skitsaas/sdk/server';
import { configureRateLimitBackend } from '@skitsaas/sdk';
import { configureBuildFormPreflightRateLimit } from '@/lib/forms/preflight';
import { checkRateLimit } from '@/lib/routing/rate-limit';
import { createRedisRateLimitBackend, hasRateLimitRedisConfig } from '@/lib/routing/rate-limit-redis';
import { enrichUser } from '@skitsaas/sdk';
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
import { resolveUiFormTemplateForArea } from '@/lib/templates/ui-form';
import * as rootSchema from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { emitEvent, emitEventAsync } from '@/lib/events/bus';
import { setSession } from '@/lib/auth/session';
import { createSystemNotification } from '@/lib/notifications/service';
import { quotaAdapter } from '@/lib/quota/service';
import { and, eq, isNull } from 'drizzle-orm';
import appConfig from '@/app.config';
import { getUserContext } from '@/lib/auth/contexts';

let bootstrapped = false;
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

function normalizeBuildFormTemplateArea(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'public') {
    return 'frontend' as const;
  }

  if (
    normalized === 'admin' ||
    normalized === 'dashboard' ||
    normalized === 'frontend' ||
    normalized === 'global'
  ) {
    return normalized;
  }

  return 'frontend' as const;
}

async function requireAdminDashboardUser() {
  const currentUser = await requireDashboardUser();
  const role = normalizeRole((currentUser as { role?: unknown }).role);
  if (!enrichUser({ id: 0, role }).isAdmin()) {
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

  configureBuildFormUiTemplateResolver({
    resolveFormTemplate: async ({
      area,
      route = null,
      themeId = null,
      moduleId = null,
      data
    }) => {
      const template = await resolveUiFormTemplateForArea({
        area: normalizeBuildFormTemplateArea(area),
        route,
        themeId,
        moduleId,
        data
      });

      return {
        templateId: template.templateId,
        templateSource: template.source,
        templateComponentId: 'ui.form',
        templatePayload: template.payload
      };
    }
  });

  configureBuildFormValidationObservability(
    createBuildFormSysActivityObserver()
  );

  configureSubscriptionFeatures(quotaAdapter);

  // ---------------------------------------------------------------------------
  // User roles & context — maps app.config.ts role arrays to SDK enrichUser()
  // ---------------------------------------------------------------------------
  configureUserRoles({
    adminAreaRoles:     appConfig.roles?.adminArea     ?? ['admin'],
    dashboardAreaRoles: appConfig.roles?.dashboardArea ?? ['member', 'owner'],
  });

  configureUserContext({
    resolve: (userId, role) =>
      getUserContext({ id: userId, role } as Parameters<typeof getUserContext>[0]),
  });

  // ---------------------------------------------------------------------------
  // Distributed rate limit backend — Redis (REDIS_URL or RATE_LIMIT_REDIS_URL).
  // Covers ALL withRateLimit usages across core and modules.
  // Falls back to in-memory (single-instance / dev) when not configured.
  //
  // To use Upstash or a custom backend instead, replace this call with your own:
  //   configureRateLimitBackend(async (ctx) => {
  //     const { success, reset } = await ratelimit.limit(ctx.customKey ?? ...)
  //     return { limited: !success, retryAfterSeconds: ... }
  //   })
  // ---------------------------------------------------------------------------
  if (hasRateLimitRedisConfig()) {
    configureRateLimitBackend(createRedisRateLimitBackend());
  }

  // ---------------------------------------------------------------------------
  // Form preflight rate limit — 30 requests / 60 s per authenticated user
  // (or IP for public forms). Prevents enumeration and brute-force of db rules.
  // ---------------------------------------------------------------------------
  configureBuildFormPreflightRateLimit(async ({ request, currentUser }) => {
    const result = await checkRateLimit(
      {
        key: (ctx) => `preflight:${currentUser?.id ?? ctx.ip}`,
        limit: 30,
        windowSeconds: 60,
      },
      request
    );
    if (result.limited) {
      return {
        allowed: false,
        retryAfterSeconds: result.retryAfterSeconds,
        error: 'Too many requests. Please wait before retrying.',
      };
    }
    return { allowed: true };
  });

  bootstrapped = true;
}

bootstrapModuleSdkServer();
