'use server';

import { eq } from 'drizzle-orm';
import { inferAppConfigIsSecret } from '@/lib/config/app-config';
import {
  deleteAppConfigEntry,
  upsertAppConfigEntry
} from '@/lib/config/app-config-writes';
import { db } from '@/lib/db/drizzle';
import { appModules } from '@/lib/db/schema';
import { emitEventAsync } from '@/lib/events/bus';
import { EVENT_HOOKS } from '@/lib/events/catalog';
import type { ModuleRuntimeConfigField } from '@/lib/modules/manifest';
import { getModuleManifest } from '@/lib/modules/registry';
import { getResolvedAppConfig } from '@/lib/runtime-config/load-app-config';
import { adminAction } from '../../controller';
import {
  revalidateAdminAppConfig,
  revalidateAdminPayments,
  revalidateDashboard,
  revalidatePricing
} from '../../actions/shared';

function normalizeBooleanInput(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  ) {
    return true;
  }

  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'off'
  ) {
    return false;
  }

  return null;
}

function inferModuleInstallMode(moduleId: string) {
  return moduleId.startsWith('core.') || moduleId.startsWith('ops.')
    ? 'core'
    : 'plugin';
}

function resolveModuleRuntimeFieldName(index: number) {
  return `configValues.${index}`;
}

function resolveModuleRuntimeFieldKind(field: ModuleRuntimeConfigField) {
  if (field.kind) {
    return field.kind;
  }

  return field.secret ? 'password' : 'text';
}

function resolveModuleRuntimeFieldNamespace(
  moduleId: string,
  field: ModuleRuntimeConfigField,
  defaultNamespace?: string
) {
  const normalizedFieldNamespace = field.namespace?.trim();
  if (normalizedFieldNamespace) {
    return normalizedFieldNamespace;
  }

  const normalizedDefaultNamespace = defaultNamespace?.trim();
  if (normalizedDefaultNamespace) {
    return normalizedDefaultNamespace;
  }

  return `modules.${moduleId}`;
}

function normalizeModuleRuntimeFieldValue({
  field,
  rawValue
}: {
  field: ModuleRuntimeConfigField;
  rawValue: string;
}) {
  const kind = resolveModuleRuntimeFieldKind(field);
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return { ok: true as const, value: null };
  }

  if (kind === 'boolean') {
    const parsed = normalizeBooleanInput(trimmedValue);
    if (parsed === null) {
      return { ok: false as const, value: null };
    }

    return { ok: true as const, value: parsed ? 'true' : 'false' };
  }

  if (kind === 'number') {
    const parsed = Number(trimmedValue);
    if (!Number.isFinite(parsed)) {
      return { ok: false as const, value: null };
    }

    return { ok: true as const, value: String(parsed) };
  }

  if (kind === 'select') {
    const options = Array.isArray(field.options) ? field.options : [];
    const optionValues = new Set(
      options.map((option) => String(option.value).trim()).filter(Boolean)
    );
    if (!optionValues.has(trimmedValue)) {
      return { ok: false as const, value: null };
    }
  }

  return { ok: true as const, value: trimmedValue };
}

function isModuleRuntimeStatusLocked(moduleId: string) {
  const resolvedAppConfig = getResolvedAppConfig();
  const hasConfigOverride = Object.prototype.hasOwnProperty.call(
    resolvedAppConfig.modules,
    moduleId
  );

  if (resolvedAppConfig.moduleRuntimeMode === 'config') {
    return true;
  }

  if (resolvedAppConfig.moduleRuntimeMode === 'hybrid' && hasConfigOverride) {
    return true;
  }

  return false;
}

export const upsertModuleRuntimeConfigAction = adminAction(
  async ({ user, form, formData }) => {
    const moduleId = form.string('moduleId');
    const manifest = getModuleManifest(moduleId);
    const runtimeConfig = manifest?.runtimeConfig;

    if (!manifest || !runtimeConfig?.fields?.length) {
      return false;
    }

    const updates: Array<{
      namespace: string;
      configKey: string;
      configValue: string | null;
      isSecret: boolean;
    }> = [];

    for (let index = 0; index < runtimeConfig.fields.length; index += 1) {
      const field = runtimeConfig.fields[index];
      const fieldName = resolveModuleRuntimeFieldName(index);
      const rawValue = formData.has(fieldName) ? form.string(fieldName) : '';
      const normalizedValue = normalizeModuleRuntimeFieldValue({
        field,
        rawValue
      });

      if (!normalizedValue.ok) {
        return false;
      }

      const namespace = resolveModuleRuntimeFieldNamespace(
        moduleId,
        field,
        runtimeConfig.namespace
      );
      const isSecret = Boolean(field.secret) || inferAppConfigIsSecret(field.configKey);

      if (normalizedValue.value === null) {
        await deleteAppConfigEntry({
          namespace,
          configKey: field.configKey
        });
      } else {
        await upsertAppConfigEntry({
          namespace,
          configKey: field.configKey,
          configValue: normalizedValue.value,
          isSecret
        });
      }

      updates.push({
        namespace,
        configKey: field.configKey,
        configValue: normalizedValue.value,
        isSecret
      });
    }

    await emitEventAsync(
      EVENT_HOOKS.adminAppConfigUpdated,
      {
        moduleId,
        updates
      },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        source: '/admin/app-config/modules'
      }
    );
  },
  {
    revalidate: [
      revalidateAdminAppConfig,
      revalidateAdminPayments,
      revalidateDashboard,
      revalidatePricing
    ]
  }
);

export const setModuleRuntimeStatusAction = adminAction(
  async ({ user, form }) => {
    const moduleId = form.string('moduleId');
    const enabledValue = normalizeBooleanInput(form.string('enabled'));
    const manifest = getModuleManifest(moduleId);

    if (!manifest || enabledValue === null) {
      return false;
    }

    if (isModuleRuntimeStatusLocked(moduleId)) {
      return false;
    }

    const now = new Date();
    const [existingRow] = await db
      .select({
        moduleId: appModules.moduleId,
        enabledAt: appModules.enabledAt,
        installMode: appModules.installMode
      })
      .from(appModules)
      .where(eq(appModules.moduleId, moduleId))
      .limit(1);

    if (!existingRow) {
      await db.insert(appModules).values({
        moduleId,
        version: manifest.version,
        status: enabledValue ? 'enabled' : 'disabled',
        installMode: inferModuleInstallMode(moduleId),
        installedAt: now,
        enabledAt: enabledValue ? now : null,
        disabledAt: enabledValue ? null : now,
        uninstalledAt: null,
        updatedAt: now
      });
    } else {
      await db
        .update(appModules)
        .set({
          version: manifest.version,
          status: enabledValue ? 'enabled' : 'disabled',
          installMode: existingRow.installMode || inferModuleInstallMode(moduleId),
          enabledAt: enabledValue ? now : existingRow.enabledAt,
          disabledAt: enabledValue ? null : now,
          uninstalledAt: null,
          updatedAt: now
        })
        .where(eq(appModules.moduleId, moduleId));
    }

    await emitEventAsync(
      EVENT_HOOKS.adminAppConfigUpdated,
      {
        moduleId,
        status: enabledValue ? 'enabled' : 'disabled'
      },
      {
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        source: '/admin/app-config/modules'
      }
    );
  },
  {
    revalidate: [revalidateAdminAppConfig]
  }
);
