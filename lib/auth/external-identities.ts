import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { authExternalIdentities } from '@/lib/db/schema';

function normalizeValue(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeProviderId(value: string) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    throw new Error('providerId is required.');
  }

  return normalized.toLowerCase();
}

function normalizeProviderSubject(value: string) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    throw new Error('providerSubject is required.');
  }

  return normalized;
}

export async function findExternalIdentityByProviderSubject({
  providerId,
  providerSubject
}: {
  providerId: string;
  providerSubject: string;
}) {
  const normalizedProviderId = normalizeProviderId(providerId);
  const normalizedProviderSubject = normalizeProviderSubject(providerSubject);

  const [row] = await db
    .select()
    .from(authExternalIdentities)
    .where(
      and(
        eq(authExternalIdentities.providerId, normalizedProviderId),
        eq(authExternalIdentities.providerSubject, normalizedProviderSubject)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function listExternalIdentitiesForUser(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return [];
  }

  return db
    .select()
    .from(authExternalIdentities)
    .where(eq(authExternalIdentities.userId, userId))
    .orderBy(
      asc(authExternalIdentities.providerId),
      asc(authExternalIdentities.providerSubject)
    );
}

export async function linkExternalIdentityToUser({
  userId,
  providerId,
  providerSubject,
  providerEmail = null,
  providerAccountId = null,
  displayName = null,
  avatarUrl = null,
  claims = null,
  metadata = null
}: {
  userId: number;
  providerId: string;
  providerSubject: string;
  providerEmail?: string | null;
  providerAccountId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  claims?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('userId must be a positive integer.');
  }

  const normalizedProviderId = normalizeProviderId(providerId);
  const normalizedProviderSubject = normalizeProviderSubject(providerSubject);

  const claimsValue = claims ? JSON.stringify(claims) : null;
  const metadataValue = metadata ? JSON.stringify(metadata) : null;

  const [row] = await db
    .insert(authExternalIdentities)
    .values({
      userId,
      providerId: normalizedProviderId,
      providerSubject: normalizedProviderSubject,
      providerEmail: normalizeValue(providerEmail),
      providerAccountId: normalizeValue(providerAccountId),
      displayName: normalizeValue(displayName),
      avatarUrl: normalizeValue(avatarUrl),
      claims: claimsValue,
      metadata: metadataValue,
      linkedAt: new Date(),
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [
        authExternalIdentities.providerId,
        authExternalIdentities.providerSubject
      ],
      set: {
        userId,
        providerEmail: normalizeValue(providerEmail),
        providerAccountId: normalizeValue(providerAccountId),
        displayName: normalizeValue(displayName),
        avatarUrl: normalizeValue(avatarUrl),
        claims: claimsValue,
        metadata: metadataValue,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    })
    .returning();

  return row ?? null;
}
