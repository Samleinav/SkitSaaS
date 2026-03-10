import 'server-only';

import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
  sql
} from 'drizzle-orm';
import { adminDb } from '@/lib/db/drizzle';
import {
  systemNotificationRecipients,
  systemNotifications
} from '@/lib/db/schema';

export type NotificationTone = 'success' | 'error' | 'info' | 'warning';
export type NotificationVisibilityArea =
  | 'auto'
  | 'admin'
  | 'dashboard'
  | 'both';
export type NotificationRuntimeArea = 'admin' | 'dashboard';
export type NotificationAudienceType = 'global' | 'direct';

export type NotificationAudience =
  | {
      type: 'global';
    }
  | {
      type: 'users';
      userIds: number[];
    };

export type CreateSystemNotificationInput = {
  audience?: NotificationAudience;
  title?: string | null;
  message: string;
  tone?: NotificationTone | null;
  area?: NotificationVisibilityArea | null;
  source?: string | null;
  metadata?: unknown;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  createdByUserId?: number | null;
};

export type SystemNotificationListItem = {
  id: number;
  title: string | null;
  message: string;
  tone: NotificationTone;
  area: NotificationVisibilityArea;
  audienceType: NotificationAudienceType;
  source: string | null;
  metadata: unknown;
  startsAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null;
};

export type ListNotificationsForUserInput = {
  userId: number;
  userRole?: string | null;
  area: NotificationRuntimeArea;
  includeRead?: boolean;
  limit?: number;
};

export type UpdateNotificationsForUserInput = {
  userId: number;
  userRole?: string | null;
  area: NotificationRuntimeArea;
  notificationIds: number[];
};

export type CreateSystemNotificationResult = {
  notificationId: number;
  audienceType: NotificationAudienceType;
  recipientUserIds: number[];
};

const ADMIN_LIKE_ROLES = new Set(['admin', 'owner']);

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toNotificationTone(value: unknown): NotificationTone {
  if (
    value === 'success' ||
    value === 'error' ||
    value === 'info' ||
    value === 'warning'
  ) {
    return value;
  }

  return 'info';
}

function toNotificationArea(value: unknown): NotificationVisibilityArea {
  if (
    value === 'auto' ||
    value === 'admin' ||
    value === 'dashboard' ||
    value === 'both'
  ) {
    return value;
  }

  return 'auto';
}

function toPositiveInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeMetadata(metadata: unknown) {
  if (metadata === undefined) {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

function parseMetadata(metadata: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    return JSON.parse(metadata) as unknown;
  } catch {
    return null;
  }
}

export function normalizeNotificationUserIds(userIds: number[]) {
  return Array.from(
    new Set(userIds.map((value) => toPositiveInt(value)).filter(Boolean) as number[])
  ).sort((left, right) => left - right);
}

export function resolveNotificationRuntimeAreaForRole(
  userRole: string | null | undefined
): NotificationRuntimeArea {
  const normalizedRole = userRole?.trim().toLowerCase();
  if (normalizedRole && ADMIN_LIKE_ROLES.has(normalizedRole)) {
    return 'admin';
  }

  return 'dashboard';
}

export function resolveNotificationVisibilityAreasForUser({
  area,
  userRole
}: {
  area: NotificationRuntimeArea;
  userRole?: string | null;
}) {
  const visibleAreas: NotificationVisibilityArea[] = [area, 'both'];

  if (resolveNotificationRuntimeAreaForRole(userRole) === area) {
    visibleAreas.push('auto');
  }

  return Array.from(new Set(visibleAreas));
}

function normalizeNotificationLimit(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return 25;
  }

  return Math.min(value, 100);
}

function createActiveNotificationCondition(now: Date) {
  return and(
    lte(systemNotifications.startsAt, now),
    or(
      isNull(systemNotifications.expiresAt),
      gt(systemNotifications.expiresAt, now)
    )
  );
}

function createAudienceCondition() {
  return or(
    eq(systemNotifications.audienceType, 'global'),
    and(
      eq(systemNotifications.audienceType, 'direct'),
      sql`${systemNotificationRecipients.userId} is not null`
    )
  );
}

function createVisibilityCondition({
  area,
  userRole
}: {
  area: NotificationRuntimeArea;
  userRole?: string | null;
}) {
  const visibleAreas = resolveNotificationVisibilityAreasForUser({
    area,
    userRole
  });

  return inArray(systemNotifications.area, visibleAreas);
}

export async function createSystemNotification(
  input: CreateSystemNotificationInput
): Promise<CreateSystemNotificationResult> {
  const message = toTrimmedString(input.message);
  if (!message) {
    throw new Error('createSystemNotification requires a non-empty message.');
  }

  const title = toTrimmedString(input.title ?? null);
  const source = toTrimmedString(input.source ?? null);
  const createdByUserId = toPositiveInt(input.createdByUserId ?? null);
  const startsAt = toDate(input.startsAt) ?? new Date();
  const expiresAt = toDate(input.expiresAt);
  if (expiresAt && expiresAt <= startsAt) {
    throw new Error('Notification expiresAt must be later than startsAt.');
  }

  const audience = input.audience ?? { type: 'global' };
  const recipientUserIds =
    audience.type === 'users'
      ? normalizeNotificationUserIds(audience.userIds)
      : [];

  if (audience.type === 'users' && recipientUserIds.length === 0) {
    throw new Error(
      'createSystemNotification requires at least one target user for audience.type="users".'
    );
  }

  const now = new Date();

  return adminDb.transaction(async (tx) => {
    const [notification] = await tx
      .insert(systemNotifications)
      .values({
        audienceType: audience.type === 'global' ? 'global' : 'direct',
        area: toNotificationArea(input.area),
        tone: toNotificationTone(input.tone),
        title,
        message,
        source,
        metadata: serializeMetadata(input.metadata),
        startsAt,
        expiresAt,
        createdByUserId,
        createdAt: now,
        updatedAt: now
      })
      .returning({
        id: systemNotifications.id,
        audienceType: systemNotifications.audienceType
      });

    if (!notification) {
      throw new Error('Unable to create system notification.');
    }

    if (recipientUserIds.length > 0) {
      await tx.insert(systemNotificationRecipients).values(
        recipientUserIds.map((userId) => ({
          notificationId: notification.id,
          userId,
          createdAt: now,
          updatedAt: now
        }))
      );
    }

    return {
      notificationId: notification.id,
      audienceType: notification.audienceType as NotificationAudienceType,
      recipientUserIds
    };
  });
}

export async function createGlobalSystemNotification(
  input: Omit<CreateSystemNotificationInput, 'audience'>
) {
  return createSystemNotification({
    ...input,
    audience: { type: 'global' }
  });
}

export async function createUserSystemNotification(
  userId: number,
  input: Omit<CreateSystemNotificationInput, 'audience'>
) {
  return createSystemNotification({
    ...input,
    audience: { type: 'users', userIds: [userId] }
  });
}

export async function createUsersSystemNotification(
  userIds: number[],
  input: Omit<CreateSystemNotificationInput, 'audience'>
) {
  return createSystemNotification({
    ...input,
    audience: { type: 'users', userIds }
  });
}

export async function listNotificationsForUser({
  userId,
  userRole,
  area,
  includeRead = false,
  limit
}: ListNotificationsForUserInput): Promise<SystemNotificationListItem[]> {
  const normalizedUserId = toPositiveInt(userId);
  if (!normalizedUserId) {
    return [];
  }

  const now = new Date();
  const rows = await adminDb
    .select({
      id: systemNotifications.id,
      title: systemNotifications.title,
      message: systemNotifications.message,
      tone: systemNotifications.tone,
      area: systemNotifications.area,
      audienceType: systemNotifications.audienceType,
      source: systemNotifications.source,
      metadata: systemNotifications.metadata,
      startsAt: systemNotifications.startsAt,
      expiresAt: systemNotifications.expiresAt,
      createdAt: systemNotifications.createdAt,
      readAt: systemNotificationRecipients.readAt,
      dismissedAt: systemNotificationRecipients.dismissedAt
    })
    .from(systemNotifications)
    .leftJoin(
      systemNotificationRecipients,
      and(
        eq(systemNotificationRecipients.notificationId, systemNotifications.id),
        eq(systemNotificationRecipients.userId, normalizedUserId)
      )
    )
    .where(
      and(
        createActiveNotificationCondition(now),
        createAudienceCondition(),
        createVisibilityCondition({
          area,
          userRole
        }),
        isNull(systemNotificationRecipients.dismissedAt),
        includeRead ? undefined : isNull(systemNotificationRecipients.readAt)
      )
    )
    .orderBy(desc(systemNotifications.createdAt), desc(systemNotifications.id))
    .limit(normalizeNotificationLimit(limit));

  return rows.map((row) => ({
    id: row.id,
    title: row.title ?? null,
    message: row.message,
    tone: toNotificationTone(row.tone),
    area: toNotificationArea(row.area),
    audienceType:
      row.audienceType === 'direct' ? 'direct' : 'global',
    source: row.source ?? null,
    metadata: parseMetadata(row.metadata),
    startsAt: row.startsAt,
    expiresAt: row.expiresAt ?? null,
    createdAt: row.createdAt,
    readAt: row.readAt ?? null,
    dismissedAt: row.dismissedAt ?? null
  }));
}

async function resolveAccessibleNotificationIds({
  userId,
  userRole,
  area,
  notificationIds
}: UpdateNotificationsForUserInput) {
  const normalizedUserId = toPositiveInt(userId);
  const normalizedNotificationIds = normalizeNotificationUserIds(notificationIds);
  if (!normalizedUserId || normalizedNotificationIds.length === 0) {
    return [];
  }

  const now = new Date();
  const rows = await adminDb
    .select({
      id: systemNotifications.id
    })
    .from(systemNotifications)
    .leftJoin(
      systemNotificationRecipients,
      and(
        eq(systemNotificationRecipients.notificationId, systemNotifications.id),
        eq(systemNotificationRecipients.userId, normalizedUserId)
      )
    )
    .where(
      and(
        inArray(systemNotifications.id, normalizedNotificationIds),
        createActiveNotificationCondition(now),
        createAudienceCondition(),
        createVisibilityCondition({
          area,
          userRole
        }),
        isNull(systemNotificationRecipients.dismissedAt)
      )
    );

  return rows.map((row) => row.id);
}

async function updateNotificationsForUser({
  userId,
  userRole,
  area,
  notificationIds,
  dismiss
}: UpdateNotificationsForUserInput & {
  dismiss: boolean;
}) {
  const accessibleIds = await resolveAccessibleNotificationIds({
    userId,
    userRole,
    area,
    notificationIds
  });

  if (accessibleIds.length === 0) {
    return 0;
  }

  const now = new Date();
  await adminDb
    .insert(systemNotificationRecipients)
    .values(
      accessibleIds.map((notificationId) => ({
        notificationId,
        userId,
        readAt: now,
        dismissedAt: dismiss ? now : null,
        createdAt: now,
        updatedAt: now
      }))
    )
    .onConflictDoUpdate({
      target: [
        systemNotificationRecipients.notificationId,
        systemNotificationRecipients.userId
      ],
      set: dismiss
        ? {
            readAt: now,
            dismissedAt: now,
            updatedAt: now
          }
        : {
            readAt: now,
            updatedAt: now
          }
    });

  return accessibleIds.length;
}

export async function markNotificationsReadForUser(
  input: UpdateNotificationsForUserInput
) {
  return updateNotificationsForUser({
    ...input,
    dismiss: false
  });
}

export async function dismissNotificationsForUser(
  input: UpdateNotificationsForUserInput
) {
  return updateNotificationsForUser({
    ...input,
    dismiss: true
  });
}
