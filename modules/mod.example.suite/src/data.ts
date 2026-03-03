import { and, desc, eq, or } from '@skitsaas/sdk/db';
import { getAdminDb, getTable } from '@skitsaas/sdk/server';
import { modExampleSuiteItems, modExampleSuiteSettings } from '../db/schema';
import {
  EXAMPLE_SUITE_DEFAULT_SETTINGS,
  EXAMPLE_SUITE_SETTINGS_KEYS,
  type ExampleSuiteApiWriteMode,
  type ExampleSuiteItemStatus,
  normalizeExampleSuiteApiWriteMode,
  normalizeExampleSuitePriority,
  normalizeExampleSuiteStatus,
  parseCheckboxValue
} from './constants';

export type ExampleSuiteItemWithOwner = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  isPublic: boolean;
  ownerUserId: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExampleSuiteSettings = {
  allowDashboardCreate: boolean;
  apiWriteMode: ExampleSuiteApiWriteMode;
  defaultStatus: ExampleSuiteItemStatus;
};

type ExampleSuiteItemRow = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  isPublic: boolean;
  ownerUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string | null;
  ownerEmail: string | null;
};

type ExampleSuiteItemInput = {
  title: string;
  description?: string;
  status: ExampleSuiteItemStatus;
  priority?: number;
  isPublic?: boolean;
  ownerUserId?: number | null;
};

type ExampleSuiteItemUpdateInput = {
  title?: string;
  description?: string | null;
  status?: ExampleSuiteItemStatus;
  priority?: number;
  isPublic?: boolean;
};

function normalizeNullableText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapItemRow(
  row: ExampleSuiteItemRow | undefined
) {
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
  } satisfies ExampleSuiteItemWithOwner;
}

function getExampleSuiteDb() {
  return getAdminDb<any>();
}

function getUsersTable() {
  return getTable<any>('users');
}

export async function listExampleSuiteItemsForAdmin(limit: number = 200) {
  const db = getExampleSuiteDb();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExampleSuiteItems.id,
      title: modExampleSuiteItems.title,
      description: modExampleSuiteItems.description,
      status: modExampleSuiteItems.status,
      priority: modExampleSuiteItems.priority,
      isPublic: modExampleSuiteItems.isPublic,
      ownerUserId: modExampleSuiteItems.ownerUserId,
      createdAt: modExampleSuiteItems.createdAt,
      updatedAt: modExampleSuiteItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExampleSuiteItems)
    .leftJoin(users, eq(modExampleSuiteItems.ownerUserId, users.id))
    .orderBy(
      desc(modExampleSuiteItems.updatedAt),
      desc(modExampleSuiteItems.createdAt),
      desc(modExampleSuiteItems.id)
    )
    .limit(Math.max(1, Math.min(limit, 500)));

  return rows
    .map((row: ExampleSuiteItemRow) => mapItemRow(row))
    .filter(Boolean) as ExampleSuiteItemWithOwner[];
}

export async function listExampleSuiteItemsForUser({
  userId,
  limit = 100
}: {
  userId: number;
  limit?: number;
}) {
  const db = getExampleSuiteDb();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExampleSuiteItems.id,
      title: modExampleSuiteItems.title,
      description: modExampleSuiteItems.description,
      status: modExampleSuiteItems.status,
      priority: modExampleSuiteItems.priority,
      isPublic: modExampleSuiteItems.isPublic,
      ownerUserId: modExampleSuiteItems.ownerUserId,
      createdAt: modExampleSuiteItems.createdAt,
      updatedAt: modExampleSuiteItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExampleSuiteItems)
    .leftJoin(users, eq(modExampleSuiteItems.ownerUserId, users.id))
    .where(
      or(
        eq(modExampleSuiteItems.isPublic, true),
        eq(modExampleSuiteItems.ownerUserId, userId)
      )
    )
    .orderBy(desc(modExampleSuiteItems.updatedAt), desc(modExampleSuiteItems.id))
    .limit(Math.max(1, Math.min(limit, 300)));

  return rows
    .map((row: ExampleSuiteItemRow) => mapItemRow(row))
    .filter(Boolean) as ExampleSuiteItemWithOwner[];
}

export async function listExampleSuitePublicItems(limit: number = 100) {
  const db = getExampleSuiteDb();
  const users = getUsersTable();
  const rows = await db
    .select({
      id: modExampleSuiteItems.id,
      title: modExampleSuiteItems.title,
      description: modExampleSuiteItems.description,
      status: modExampleSuiteItems.status,
      priority: modExampleSuiteItems.priority,
      isPublic: modExampleSuiteItems.isPublic,
      ownerUserId: modExampleSuiteItems.ownerUserId,
      createdAt: modExampleSuiteItems.createdAt,
      updatedAt: modExampleSuiteItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExampleSuiteItems)
    .leftJoin(users, eq(modExampleSuiteItems.ownerUserId, users.id))
    .where(eq(modExampleSuiteItems.isPublic, true))
    .orderBy(desc(modExampleSuiteItems.updatedAt), desc(modExampleSuiteItems.id))
    .limit(Math.max(1, Math.min(limit, 300)));

  return rows
    .map((row: ExampleSuiteItemRow) => mapItemRow(row))
    .filter(Boolean) as ExampleSuiteItemWithOwner[];
}

export async function getExampleSuiteItemById(itemId: number) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  const db = getExampleSuiteDb();
  const users = getUsersTable();
  const [row] = await db
    .select({
      id: modExampleSuiteItems.id,
      title: modExampleSuiteItems.title,
      description: modExampleSuiteItems.description,
      status: modExampleSuiteItems.status,
      priority: modExampleSuiteItems.priority,
      isPublic: modExampleSuiteItems.isPublic,
      ownerUserId: modExampleSuiteItems.ownerUserId,
      createdAt: modExampleSuiteItems.createdAt,
      updatedAt: modExampleSuiteItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExampleSuiteItems)
    .leftJoin(users, eq(modExampleSuiteItems.ownerUserId, users.id))
    .where(eq(modExampleSuiteItems.id, itemId))
    .limit(1);

  return mapItemRow(row);
}

export async function createExampleSuiteItem(input: ExampleSuiteItemInput) {
  const title = input.title.trim();
  if (!title) {
    return null;
  }

  const status = normalizeExampleSuiteStatus(input.status);
  const priority = normalizeExampleSuitePriority(input.priority);
  const description = normalizeNullableText(input.description);
  const db = getExampleSuiteDb();
  const [created] = await db
    .insert(modExampleSuiteItems)
    .values({
      title,
      description,
      status,
      priority,
      isPublic: Boolean(input.isPublic),
      ownerUserId: input.ownerUserId ?? null,
      updatedAt: new Date()
    })
    .returning({
      id: modExampleSuiteItems.id
    });

  if (!created) {
    return null;
  }

  return getExampleSuiteItemById(created.id);
}

export async function updateExampleSuiteItem(
  itemId: number,
  input: ExampleSuiteItemUpdateInput
) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  const setValues: Partial<typeof modExampleSuiteItems.$inferInsert> & {
    updatedAt: Date;
  } = {
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

  if (input.status) {
    setValues.status = normalizeExampleSuiteStatus(input.status);
  }

  if (input.priority !== undefined) {
    setValues.priority = normalizeExampleSuitePriority(input.priority);
  }

  if (input.isPublic !== undefined) {
    setValues.isPublic = input.isPublic;
  }

  const db = getExampleSuiteDb();
  await db
    .update(modExampleSuiteItems)
    .set(setValues)
    .where(eq(modExampleSuiteItems.id, itemId));

  return getExampleSuiteItemById(itemId);
}

export async function deleteExampleSuiteItem(itemId: number) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return false;
  }

  const db = getExampleSuiteDb();
  const result = await db
    .delete(modExampleSuiteItems)
    .where(eq(modExampleSuiteItems.id, itemId))
    .returning({ id: modExampleSuiteItems.id });

  return result.length > 0;
}

export async function getExampleSuiteSettings(): Promise<ExampleSuiteSettings> {
  const db = getExampleSuiteDb();
  const rows = await db
    .select({
      settingKey: modExampleSuiteSettings.settingKey,
      settingValue: modExampleSuiteSettings.settingValue
    })
    .from(modExampleSuiteSettings)
    .where(
      or(
        eq(
          modExampleSuiteSettings.settingKey,
          EXAMPLE_SUITE_SETTINGS_KEYS.allowDashboardCreate
        ),
        eq(
          modExampleSuiteSettings.settingKey,
          EXAMPLE_SUITE_SETTINGS_KEYS.apiWriteMode
        ),
        eq(
          modExampleSuiteSettings.settingKey,
          EXAMPLE_SUITE_SETTINGS_KEYS.defaultStatus
        )
      )
    );

  const byKey = new Map(
    rows.map((row: { settingKey: string; settingValue: string }) => [
      row.settingKey,
      row.settingValue
    ])
  );

  const allowDashboardCreate = parseCheckboxValue(
    byKey.get(EXAMPLE_SUITE_SETTINGS_KEYS.allowDashboardCreate) ??
      String(EXAMPLE_SUITE_DEFAULT_SETTINGS.allowDashboardCreate)
  );
  const apiWriteMode = normalizeExampleSuiteApiWriteMode(
    byKey.get(EXAMPLE_SUITE_SETTINGS_KEYS.apiWriteMode),
    EXAMPLE_SUITE_DEFAULT_SETTINGS.apiWriteMode
  );
  const defaultStatus = normalizeExampleSuiteStatus(
    byKey.get(EXAMPLE_SUITE_SETTINGS_KEYS.defaultStatus),
    EXAMPLE_SUITE_DEFAULT_SETTINGS.defaultStatus
  );

  return {
    allowDashboardCreate,
    apiWriteMode,
    defaultStatus
  };
}

export async function updateExampleSuiteSettings({
  allowDashboardCreate,
  apiWriteMode,
  defaultStatus,
  updatedByUserId
}: {
  allowDashboardCreate: boolean;
  apiWriteMode: ExampleSuiteApiWriteMode;
  defaultStatus: ExampleSuiteItemStatus;
  updatedByUserId?: number;
}) {
  const db = getExampleSuiteDb();
  const now = new Date();
  const values = [
    {
      settingKey: EXAMPLE_SUITE_SETTINGS_KEYS.allowDashboardCreate,
      settingValue: allowDashboardCreate ? 'true' : 'false'
    },
    {
      settingKey: EXAMPLE_SUITE_SETTINGS_KEYS.apiWriteMode,
      settingValue: normalizeExampleSuiteApiWriteMode(apiWriteMode)
    },
    {
      settingKey: EXAMPLE_SUITE_SETTINGS_KEYS.defaultStatus,
      settingValue: normalizeExampleSuiteStatus(defaultStatus)
    }
  ];

  await Promise.all(
    values.map((entry) =>
      db
        .insert(modExampleSuiteSettings)
        .values({
          settingKey: entry.settingKey,
          settingValue: entry.settingValue,
          updatedByUserId: updatedByUserId ?? null,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [modExampleSuiteSettings.settingKey],
          set: {
            settingValue: entry.settingValue,
            updatedByUserId: updatedByUserId ?? null,
            updatedAt: now
          }
        })
    )
  );
}

export async function getEditableExampleSuiteItemForUser({
  itemId,
  userId
}: {
  itemId: number;
  userId: number;
}) {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return null;
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const db = getExampleSuiteDb();
  const users = getUsersTable();
  const [row] = await db
    .select({
      id: modExampleSuiteItems.id,
      title: modExampleSuiteItems.title,
      description: modExampleSuiteItems.description,
      status: modExampleSuiteItems.status,
      priority: modExampleSuiteItems.priority,
      isPublic: modExampleSuiteItems.isPublic,
      ownerUserId: modExampleSuiteItems.ownerUserId,
      createdAt: modExampleSuiteItems.createdAt,
      updatedAt: modExampleSuiteItems.updatedAt,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(modExampleSuiteItems)
    .leftJoin(users, eq(modExampleSuiteItems.ownerUserId, users.id))
    .where(
      and(
        eq(modExampleSuiteItems.id, itemId),
        eq(modExampleSuiteItems.ownerUserId, userId)
      )
    )
    .limit(1);

  return mapItemRow(row);
}
