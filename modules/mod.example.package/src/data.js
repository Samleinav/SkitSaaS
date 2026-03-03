import { and, desc, eq, or } from '@skitsaas/sdk/db';
import { getAdminDb, getTable } from '@skitsaas/sdk/server';
import { modExamplePackageItems, modExamplePackageSettings } from '../db/schema';
import {
  EXAMPLE_PACKAGE_DEFAULT_SETTINGS,
  EXAMPLE_PACKAGE_SETTINGS_KEYS,
  normalizeExamplePackageApiWriteMode,
  normalizeExamplePackagePriority,
  normalizeExamplePackageStatus,
  parseCheckboxValue
} from './constants';

function normalizeNullableText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getDbClient() {
  return getAdminDb();
}

function getUsersTable() {
  return getTable('users');
}

function mapItemRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    isPublic: row.isPublic,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listExamplePackageItemsForAdmin(limit = 200) {
  const db = getDbClient();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExamplePackageItems.id,
      title: modExamplePackageItems.title,
      description: modExamplePackageItems.description,
      status: modExamplePackageItems.status,
      priority: modExamplePackageItems.priority,
      isPublic: modExamplePackageItems.isPublic,
      ownerUserId: modExamplePackageItems.ownerUserId,
      createdAt: modExamplePackageItems.createdAt,
      updatedAt: modExamplePackageItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExamplePackageItems)
    .leftJoin(users, eq(modExamplePackageItems.ownerUserId, users.id))
    .orderBy(
      desc(modExamplePackageItems.updatedAt),
      desc(modExamplePackageItems.createdAt),
      desc(modExamplePackageItems.id)
    )
    .limit(Math.max(1, Math.min(limit, 500)));

  return rows.map((row) => mapItemRow(row)).filter(Boolean);
}

export async function listExamplePackageItemsForUser({ userId, limit = 120 }) {
  const db = getDbClient();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExamplePackageItems.id,
      title: modExamplePackageItems.title,
      description: modExamplePackageItems.description,
      status: modExamplePackageItems.status,
      priority: modExamplePackageItems.priority,
      isPublic: modExamplePackageItems.isPublic,
      ownerUserId: modExamplePackageItems.ownerUserId,
      createdAt: modExamplePackageItems.createdAt,
      updatedAt: modExamplePackageItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExamplePackageItems)
    .leftJoin(users, eq(modExamplePackageItems.ownerUserId, users.id))
    .where(
      or(
        eq(modExamplePackageItems.isPublic, true),
        eq(modExamplePackageItems.ownerUserId, userId)
      )
    )
    .orderBy(desc(modExamplePackageItems.updatedAt), desc(modExamplePackageItems.id))
    .limit(Math.max(1, Math.min(limit, 300)));

  return rows.map((row) => mapItemRow(row)).filter(Boolean);
}

export async function listExamplePackagePublicItems(limit = 100) {
  const db = getDbClient();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExamplePackageItems.id,
      title: modExamplePackageItems.title,
      description: modExamplePackageItems.description,
      status: modExamplePackageItems.status,
      priority: modExamplePackageItems.priority,
      isPublic: modExamplePackageItems.isPublic,
      ownerUserId: modExamplePackageItems.ownerUserId,
      createdAt: modExamplePackageItems.createdAt,
      updatedAt: modExamplePackageItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExamplePackageItems)
    .leftJoin(users, eq(modExamplePackageItems.ownerUserId, users.id))
    .where(eq(modExamplePackageItems.isPublic, true))
    .orderBy(desc(modExamplePackageItems.updatedAt), desc(modExamplePackageItems.id))
    .limit(Math.max(1, Math.min(limit, 300)));

  return rows.map((row) => mapItemRow(row)).filter(Boolean);
}

export async function getExamplePackageItemById(itemId) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  const db = getDbClient();
  const users = getUsersTable();
  const [row] = await db
    .select({
      id: modExamplePackageItems.id,
      title: modExamplePackageItems.title,
      description: modExamplePackageItems.description,
      status: modExamplePackageItems.status,
      priority: modExamplePackageItems.priority,
      isPublic: modExamplePackageItems.isPublic,
      ownerUserId: modExamplePackageItems.ownerUserId,
      createdAt: modExamplePackageItems.createdAt,
      updatedAt: modExamplePackageItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExamplePackageItems)
    .leftJoin(users, eq(modExamplePackageItems.ownerUserId, users.id))
    .where(eq(modExamplePackageItems.id, itemId))
    .limit(1);

  return mapItemRow(row);
}

export async function createExamplePackageItem(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return null;
  }

  const db = getDbClient();
  const [created] = await db
    .insert(modExamplePackageItems)
    .values({
      title,
      description: normalizeNullableText(input.description),
      status: normalizeExamplePackageStatus(input.status),
      priority: normalizeExamplePackagePriority(input.priority),
      isPublic: Boolean(input.isPublic),
      ownerUserId: input.ownerUserId ?? null,
      updatedAt: new Date()
    })
    .returning({ id: modExamplePackageItems.id });

  if (!created) {
    return null;
  }

  return getExamplePackageItemById(created.id);
}

export async function updateExamplePackageItem(itemId, input) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  const setValues = {
    updatedAt: new Date()
  };

  if (typeof input.title === 'string') {
    const title = input.title.trim();
    if (title) {
      setValues.title = title;
    }
  }

  if (input.description !== undefined) {
    setValues.description = normalizeNullableText(input.description);
  }

  if (input.status !== undefined) {
    setValues.status = normalizeExamplePackageStatus(input.status);
  }

  if (input.priority !== undefined) {
    setValues.priority = normalizeExamplePackagePriority(input.priority);
  }

  if (input.isPublic !== undefined) {
    setValues.isPublic = Boolean(input.isPublic);
  }

  const db = getDbClient();
  await db
    .update(modExamplePackageItems)
    .set(setValues)
    .where(eq(modExamplePackageItems.id, itemId));

  return getExamplePackageItemById(itemId);
}

export async function deleteExamplePackageItem(itemId) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return false;
  }

  const db = getDbClient();
  const result = await db
    .delete(modExamplePackageItems)
    .where(eq(modExamplePackageItems.id, itemId))
    .returning({ id: modExamplePackageItems.id });

  return result.length > 0;
}

export async function getExamplePackageSettings() {
  const db = getDbClient();
  const rows = await db
    .select({
      settingKey: modExamplePackageSettings.settingKey,
      settingValue: modExamplePackageSettings.settingValue
    })
    .from(modExamplePackageSettings)
    .where(
      or(
        eq(
          modExamplePackageSettings.settingKey,
          EXAMPLE_PACKAGE_SETTINGS_KEYS.allowDashboardCreate
        ),
        eq(
          modExamplePackageSettings.settingKey,
          EXAMPLE_PACKAGE_SETTINGS_KEYS.apiWriteMode
        ),
        eq(
          modExamplePackageSettings.settingKey,
          EXAMPLE_PACKAGE_SETTINGS_KEYS.defaultStatus
        )
      )
    );

  const byKey = new Map(rows.map((row) => [row.settingKey, row.settingValue]));

  return {
    allowDashboardCreate: parseCheckboxValue(
      byKey.get(EXAMPLE_PACKAGE_SETTINGS_KEYS.allowDashboardCreate) ??
        String(EXAMPLE_PACKAGE_DEFAULT_SETTINGS.allowDashboardCreate)
    ),
    apiWriteMode: normalizeExamplePackageApiWriteMode(
      byKey.get(EXAMPLE_PACKAGE_SETTINGS_KEYS.apiWriteMode),
      EXAMPLE_PACKAGE_DEFAULT_SETTINGS.apiWriteMode
    ),
    defaultStatus: normalizeExamplePackageStatus(
      byKey.get(EXAMPLE_PACKAGE_SETTINGS_KEYS.defaultStatus),
      EXAMPLE_PACKAGE_DEFAULT_SETTINGS.defaultStatus
    )
  };
}

export async function updateExamplePackageSettings({
  allowDashboardCreate,
  apiWriteMode,
  defaultStatus,
  updatedByUserId
}) {
  const db = getDbClient();
  const now = new Date();
  const values = [
    {
      settingKey: EXAMPLE_PACKAGE_SETTINGS_KEYS.allowDashboardCreate,
      settingValue: allowDashboardCreate ? 'true' : 'false'
    },
    {
      settingKey: EXAMPLE_PACKAGE_SETTINGS_KEYS.apiWriteMode,
      settingValue: normalizeExamplePackageApiWriteMode(apiWriteMode)
    },
    {
      settingKey: EXAMPLE_PACKAGE_SETTINGS_KEYS.defaultStatus,
      settingValue: normalizeExamplePackageStatus(defaultStatus)
    }
  ];

  await Promise.all(
    values.map((entry) =>
      db
        .insert(modExamplePackageSettings)
        .values({
          settingKey: entry.settingKey,
          settingValue: entry.settingValue,
          updatedByUserId: updatedByUserId ?? null,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [modExamplePackageSettings.settingKey],
          set: {
            settingValue: entry.settingValue,
            updatedByUserId: updatedByUserId ?? null,
            updatedAt: now
          }
        })
    )
  );
}

export async function getEditableExamplePackageItemForUser({ itemId, userId }) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const db = getDbClient();
  const users = getUsersTable();
  const [row] = await db
    .select({
      id: modExamplePackageItems.id,
      title: modExamplePackageItems.title,
      description: modExamplePackageItems.description,
      status: modExamplePackageItems.status,
      priority: modExamplePackageItems.priority,
      isPublic: modExamplePackageItems.isPublic,
      ownerUserId: modExamplePackageItems.ownerUserId,
      createdAt: modExamplePackageItems.createdAt,
      updatedAt: modExamplePackageItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExamplePackageItems)
    .leftJoin(users, eq(modExamplePackageItems.ownerUserId, users.id))
    .where(
      and(
        eq(modExamplePackageItems.id, itemId),
        eq(modExamplePackageItems.ownerUserId, userId)
      )
    )
    .limit(1);

  return mapItemRow(row);
}
