import type { SFile, SFilesActorContext, MoveOptions } from '@skitsaas/sdk/sfiles';
import { getSfileById, updateSfile } from '../db';
import { assertWriteAccess } from '../permissions';

function normalizeFolder(folder: string): string {
  let f = folder.startsWith('/') ? folder : `/${folder}`;
  if (!f.endsWith('/')) f = `${f}/`;
  return f;
}

export async function moveOperation(
  id: number,
  actor: SFilesActorContext,
  options: MoveOptions
): Promise<SFile> {
  const file = await getSfileById(id);
  if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });

  assertWriteAccess(file, actor);

  const targetFolder = normalizeFolder(options.folder);
  // Update DB folder — storage path stays the same (avoids storage copy overhead)
  return updateSfile(id, { folder: targetFolder });
}
