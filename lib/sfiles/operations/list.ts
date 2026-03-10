import type { SFile, SFilesActorContext, ListOptions, ListResult } from '@skitsaas/sdk/sfiles';
import { listSfiles, extractSubFolders } from '../db';
import { canAccess } from '../permissions';

export async function listOperation(
  actor: SFilesActorContext,
  options: ListOptions = {}
): Promise<ListResult> {
  const { folder = '/', includeDeleted = false, page = 1, limit = 50 } = options;

  // Load all files in this folder (we need more to find sub-folders)
  const { rows, total } = await listSfiles({ folder, includeDeleted, page, limit });

  // Also load all files under this folder to find sub-folders
  const { rows: allRows } = await listSfiles({ folder: undefined, includeDeleted, page: 1, limit: 5000 });

  // Filter files by actor permissions (public files need no grant lookup)
  const visible = rows.filter((file) => {
    if (actor.isAdmin) return true;
    if (file.ownerId === actor.userId) return true;
    if (file.visibility === 'public' || file.visibility === 'authenticated') {
      return actor.userId !== null || file.visibility === 'public';
    }
    // 'private', 'admin', 'users' — skip in list (would need per-file DB call)
    // 'users' can be resolved in get() individually
    return false;
  });

  const subFolders = extractSubFolders(folder, allRows.filter((f) => {
    if (actor.isAdmin) return true;
    if (f.ownerId === actor.userId) return true;
    return f.visibility === 'public' || (f.visibility === 'authenticated' && actor.userId !== null);
  }));

  return { files: visible, folders: subFolders, total };
}
