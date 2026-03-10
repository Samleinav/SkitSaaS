import type { SFile, SFilesActorContext, RenameOptions } from '@skitsaas/sdk/sfiles';
import { getSfileById, updateSfile } from '../db';
import { assertWriteAccess } from '../permissions';

export async function renameOperation(
  id: number,
  actor: SFilesActorContext,
  options: RenameOptions
): Promise<SFile> {
  const file = await getSfileById(id);
  if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });

  assertWriteAccess(file, actor);

  const trimmed = options.name.trim();
  if (!trimmed) throw new Error('Name cannot be empty');

  return updateSfile(id, { name: trimmed });
}
