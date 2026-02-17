import { db } from '@/lib/db/drizzle';
import { emailLogs } from '@/lib/db/schema';

export type EmailLogStatus = 'queued' | 'sent' | 'failed' | 'skipped';

type CreateEmailLogInput = {
  provider?: string;
  eventType: string;
  status?: EmailLogStatus;
  recipientEmail: string;
  recipientUserId?: number | null;
  subject?: string | null;
  source?: string | null;
  externalMessageId?: string | null;
  message?: string | null;
  metadata?: unknown;
  sentAt?: Date | null;
};

function normalizeText(value: string | null | undefined, maxLength: number) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
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

function normalizeStatus(status: string | null | undefined): EmailLogStatus {
  if (
    status === 'queued' ||
    status === 'sent' ||
    status === 'failed' ||
    status === 'skipped'
  ) {
    return status;
  }

  return 'queued';
}

export async function createEmailLog({
  provider = 'smtp',
  eventType,
  status = 'queued',
  recipientEmail,
  recipientUserId = null,
  subject = null,
  source = null,
  externalMessageId = null,
  message = null,
  metadata,
  sentAt = null
}: CreateEmailLogInput) {
  const safeEventType = normalizeText(eventType, 120);
  const safeRecipientEmail = normalizeText(recipientEmail, 255);
  if (!safeEventType || !safeRecipientEmail) {
    return;
  }

  try {
    await db.insert(emailLogs).values({
      provider: normalizeText(provider, 30) || 'smtp',
      eventType: safeEventType,
      status: normalizeStatus(status),
      recipientEmail: safeRecipientEmail,
      recipientUserId: normalizePositiveInt(recipientUserId),
      subject: normalizeText(subject, 255),
      source: normalizeText(source, 120),
      externalMessageId: normalizeText(externalMessageId, 500),
      message: normalizeText(message, 4000),
      metadata: normalizeMetadata(metadata),
      sentAt
    });
  } catch (error) {
    console.error('Unable to persist email log:', error);
  }
}
