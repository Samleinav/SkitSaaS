import { adminDb } from '@/lib/db/drizzle';
import { sysActivityLogs } from '@/lib/db/schema';
import { normalizeSystemActivityEventCategory } from '@/lib/system/activity-log-taxonomy';

type SysActivityLogStatus = 'info' | 'success' | 'warning' | 'failed';

export type PersistedSysActivityLogEntry = {
  eventType: string;
  eventCategory: string;
  action: string;
  status: SysActivityLogStatus;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetUserId: number | null;
  teamId: number | null;
  entityType: string | null;
  entityId: string | null;
  source: string | null;
  ipAddress: string | null;
  requestId: string | null;
  message: string | null;
  metadata: string | null;
};

type SysActivityLogWriter = (
  values: PersistedSysActivityLogEntry
) => Promise<void> | void;

let configuredSysActivityLogWriter: SysActivityLogWriter | null = null;

export type CreateSysActivityLogInput = {
  eventType: string;
  eventCategory?: string | null;
  action?: string | null;
  status?: SysActivityLogStatus | string | null;
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetUserId?: number | null;
  teamId?: number | null;
  entityType?: string | null;
  entityId?: string | number | null;
  source?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  message?: string | null;
  metadata?: unknown;
};

export function configureSysActivityLogWriter(
  writer: SysActivityLogWriter | null
) {
  configuredSysActivityLogWriter = writer;
}

function normalizeText(
  value: string | number | null | undefined,
  maxLength: number
) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizePositiveInt(value: number | null | undefined) {
  if (!value || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeStatus(
  status: SysActivityLogStatus | string | null | undefined
): SysActivityLogStatus {
  if (
    status === 'success' ||
    status === 'warning' ||
    status === 'failed' ||
    status === 'info'
  ) {
    return status;
  }

  return 'info';
}

function normalizeMetadata(metadata: unknown) {
  if (metadata === undefined) {
    return null;
  }

  try {
    return JSON.stringify(metadata).slice(0, 12000);
  } catch {
    return null;
  }
}

export async function createSysActivityLog({
  eventType,
  eventCategory = null,
  action = null,
  status = 'info',
  actorUserId = null,
  actorEmail = null,
  actorRole = null,
  targetUserId = null,
  teamId = null,
  entityType = null,
  entityId = null,
  source = null,
  ipAddress = null,
  requestId = null,
  message = null,
  metadata
}: CreateSysActivityLogInput) {
  const safeEventType = normalizeText(eventType, 120);
  if (!safeEventType) {
    return;
  }

  const logEntry: PersistedSysActivityLogEntry = {
    eventType: safeEventType,
    eventCategory: normalizeSystemActivityEventCategory(
      normalizeText(eventCategory, 50)
    ),
    action: normalizeText(action, 20) || 'event',
    status: normalizeStatus(status),
    actorUserId: normalizePositiveInt(actorUserId),
    actorEmail: normalizeText(actorEmail, 255),
    actorRole: normalizeText(actorRole, 30),
    targetUserId: normalizePositiveInt(targetUserId),
    teamId: normalizePositiveInt(teamId),
    entityType: normalizeText(entityType, 60),
    entityId: normalizeText(entityId, 120),
    source: normalizeText(source, 120),
    ipAddress: normalizeText(ipAddress, 45),
    requestId: normalizeText(requestId, 100),
    message: normalizeText(message, 4000),
    metadata: normalizeMetadata(metadata)
  };

  try {
    if (configuredSysActivityLogWriter) {
      await configuredSysActivityLogWriter(logEntry);
      return;
    }

    await adminDb.insert(sysActivityLogs).values(logEntry);
  } catch (error) {
    console.error('Unable to persist system activity log:', {
      eventType: logEntry.eventType,
      source: logEntry.source,
      requestId: logEntry.requestId,
      error
    });
  }
}
