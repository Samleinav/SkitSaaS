import { desc } from '@skitsaas/sdk/db';
import { getAdminDb } from '@skitsaas/sdk/server';
import { modContactSubmissions } from '../db/schema';

export type ContactSubmissionRecord = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  sourcePath: string | null;
  createdAt: Date;
};

function getContactDb() {
  return getAdminDb<any>();
}

function normalizeNullableText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeRequiredText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeSourcePath(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().slice(0, 255);
  if (!trimmed || !trimmed.startsWith('/')) {
    return null;
  }

  return trimmed;
}

export async function createContactSubmission(input: {
  name: unknown;
  email: unknown;
  subject?: unknown;
  message: unknown;
  sourcePath?: unknown;
}) {
  const name = normalizeRequiredText(input.name, 120);
  const email = normalizeRequiredText(input.email, 255);
  const message = normalizeRequiredText(input.message, 4000);

  if (!name || !email || !message) {
    return null;
  }

  const db = getContactDb();
  const [created] = await db
    .insert(modContactSubmissions)
    .values({
      name,
      email,
      subject: normalizeNullableText(input.subject, 180),
      message,
      sourcePath: normalizeSourcePath(input.sourcePath)
    })
    .returning({
      id: modContactSubmissions.id
    });

  return created ?? null;
}

export async function listContactSubmissions(limit: number = 100) {
  const db = getContactDb();
  const rows = await db
    .select({
      id: modContactSubmissions.id,
      name: modContactSubmissions.name,
      email: modContactSubmissions.email,
      subject: modContactSubmissions.subject,
      message: modContactSubmissions.message,
      sourcePath: modContactSubmissions.sourcePath,
      createdAt: modContactSubmissions.createdAt
    })
    .from(modContactSubmissions)
    .orderBy(desc(modContactSubmissions.createdAt), desc(modContactSubmissions.id))
    .limit(Math.max(1, Math.min(limit, 200)));

  return rows as ContactSubmissionRecord[];
}
