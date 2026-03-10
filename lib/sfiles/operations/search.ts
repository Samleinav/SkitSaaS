import type { SFile, SFilesActorContext, SearchOptions } from '@skitsaas/sdk/sfiles';
import { searchSfiles } from '../db';

export async function searchOperation(
  actor: SFilesActorContext,
  options: SearchOptions
): Promise<SFile[]> {
  const { query, folder, page = 1, limit = 50 } = options;

  const rows = await searchSfiles({ query, folder, page, limit });

  return rows.filter((file) => {
    if (actor.isAdmin) return true;
    if (file.ownerId === actor.userId) return true;
    if (file.visibility === 'public') return true;
    if (file.visibility === 'authenticated' && actor.userId !== null) return true;
    return false;
  });
}
