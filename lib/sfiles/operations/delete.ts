import type { SFilesAdapter, SFilesActorContext } from '@skitsaas/sdk/sfiles';
import { getSfileById, softDeleteSfile } from '../db';
import { assertWriteAccess } from '../permissions';

export async function deleteOperation(
  id: number,
  actor: SFilesActorContext,
  adapter: SFilesAdapter
): Promise<void> {
  const file = await getSfileById(id);
  if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });

  assertWriteAccess(file, actor);
  await softDeleteSfile(id);

  // Best-effort removal from storage (don't fail if storage delete fails)
  try {
    await adapter.remove(file.path);
  } catch {
    // Log but don't throw — DB record is soft-deleted, storage cleanup can retry later
  }
}
