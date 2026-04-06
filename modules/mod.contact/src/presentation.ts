import type { ContactSubmissionRecord } from './types';

function readSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

export function parseSelectedContactSubmissionId(
  searchParams?: Record<string, string | string[] | undefined>
) {
  const rawValue = readSingleSearchParam(searchParams?.messageId).trim();
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function formatContactTimestamp(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

export function getContactSubmissionSubject(
  submission: Pick<ContactSubmissionRecord, 'subject'>
) {
  const subject = submission.subject?.trim();
  return subject && subject.length > 0 ? subject : 'No subject provided';
}

export function createContactMessagePreview(message: string, maxLength = 120) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
