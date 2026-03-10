import { and, count, eq, ilike, isNull, not, or, sql } from 'drizzle-orm';
import { adminDb } from '@/lib/db/drizzle';
import { sfiles, sfilesPermissions } from '@/lib/db/schema';
import type { SFile, SFilePermission } from '@skitsaas/sdk/sfiles';

type SfileInsert = typeof sfiles.$inferInsert;
type SfileUpdate = Partial<Pick<SfileInsert,
  'name' | 'path' | 'folder' | 'mimeType' | 'size' | 'etag' | 'visibility' | 'metadata' | 'deletedAt' | 'updatedAt'
>>;

export async function insertSfile(data: SfileInsert): Promise<SFile> {
  const [row] = await adminDb.insert(sfiles).values(data).returning();
  return row as unknown as SFile;
}

export async function getSfileById(id: number): Promise<SFile | undefined> {
  const [row] = await adminDb.select().from(sfiles).where(eq(sfiles.id, id)).limit(1);
  return row as unknown as SFile | undefined;
}

export async function listSfiles(options: {
  folder?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ rows: SFile[]; total: number }> {
  const { folder, includeDeleted = false, page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (folder) conditions.push(eq(sfiles.folder, folder));
  if (!includeDeleted) conditions.push(isNull(sfiles.deletedAt));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    adminDb.select().from(sfiles).where(where).limit(limit).offset(offset),
    adminDb.select({ value: count() }).from(sfiles).where(where),
  ]);

  return { rows: rows as unknown as SFile[], total: Number(total) };
}

export async function searchSfiles(options: {
  query: string;
  folder?: string;
  page?: number;
  limit?: number;
}): Promise<SFile[]> {
  const { query, folder, page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;
  const pattern = `%${query}%`;

  const conditions = [
    or(ilike(sfiles.name, pattern), ilike(sfiles.folder, pattern)),
    isNull(sfiles.deletedAt),
  ];
  if (folder) conditions.push(eq(sfiles.folder, folder));

  const rows = await adminDb
    .select()
    .from(sfiles)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset);

  return rows as unknown as SFile[];
}

export async function updateSfile(id: number, data: SfileUpdate): Promise<SFile> {
  const [row] = await adminDb
    .update(sfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sfiles.id, id))
    .returning();
  return row as unknown as SFile;
}

export async function softDeleteSfile(id: number): Promise<void> {
  await adminDb
    .update(sfiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(sfiles.id, id));
}

export async function getPermittedUserIds(fileId: number): Promise<number[]> {
  const rows = await adminDb
    .select({ userId: sfilesPermissions.userId })
    .from(sfilesPermissions)
    .where(eq(sfilesPermissions.fileId, fileId));
  return rows.map((r) => r.userId);
}

export async function setPermissions(fileId: number, userIds: number[]): Promise<void> {
  await adminDb.delete(sfilesPermissions).where(eq(sfilesPermissions.fileId, fileId));
  if (userIds.length > 0) {
    await adminDb.insert(sfilesPermissions).values(
      userIds.map((userId) => ({ fileId, userId }))
    );
  }
}

export async function getPermissions(fileId: number): Promise<SFilePermission[]> {
  const rows = await adminDb
    .select()
    .from(sfilesPermissions)
    .where(eq(sfilesPermissions.fileId, fileId));
  return rows as unknown as SFilePermission[];
}

/** Extract unique sub-folder paths from a list of file rows */
export function extractSubFolders(parentFolder: string, rows: SFile[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const f = row.folder;
    if (f === parentFolder || !f.startsWith(parentFolder)) continue;
    // immediate sub-folder only
    const remainder = f.slice(parentFolder.length);
    const parts = remainder.split('/').filter(Boolean);
    if (parts.length > 0) {
      seen.add(`${parentFolder}${parts[0]}/`);
    }
  }
  return [...seen].sort();
}
