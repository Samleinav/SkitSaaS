import type { SFile, SFilesActorContext } from '@skitsaas/sdk/sfiles';
import { getPermittedUserIds } from './db';

export function canAccess(
  file: SFile,
  actor: SFilesActorContext,
  grantedUserIds: number[]
): boolean {
  // Admins bypass all restrictions
  if (actor.isAdmin) return true;

  // Owner always has access to their own files
  if (file.ownerId !== null && file.ownerId === actor.userId) return true;

  // Admin-only files are not accessible to non-admins
  if (file.visibility === 'admin') return false;

  // Private files: owner + admin only (already handled above)
  if (file.visibility === 'private') return false;

  // Public: everyone
  if (file.visibility === 'public') return true;

  // Authenticated: any logged-in user
  if (file.visibility === 'authenticated') return actor.userId !== null;

  // Users: explicit grant list
  if (file.visibility === 'users') {
    return actor.userId !== null && grantedUserIds.includes(actor.userId);
  }

  return false;
}

export function canWrite(file: SFile, actor: SFilesActorContext): boolean {
  if (actor.isAdmin) return true;
  return file.ownerId !== null && file.ownerId === actor.userId;
}

/**
 * Throws an error with code 'FORBIDDEN' if actor cannot read the file.
 * Loads granted user IDs from DB only when visibility === 'users'.
 */
export async function assertReadAccess(file: SFile, actor: SFilesActorContext): Promise<void> {
  const grantedUserIds =
    file.visibility === 'users' ? await getPermittedUserIds(file.id) : [];
  if (!canAccess(file, actor, grantedUserIds)) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN' });
  }
}

/**
 * Throws an error with code 'FORBIDDEN' if actor cannot modify the file.
 */
export function assertWriteAccess(file: SFile, actor: SFilesActorContext): void {
  if (!canWrite(file, actor)) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN' });
  }
}
