import type { SFileReadResult, SFilesAdapter, SFilesActorContext } from '@skitsaas/sdk/sfiles';
import { getSfileById } from '../db';
import { assertReadAccess } from '../permissions';

export async function readOperation(
  id: number,
  actor: SFilesActorContext,
  adapter: SFilesAdapter
): Promise<SFileReadResult> {
  const file = await getSfileById(id);
  if (!file) {
    throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });
  }

  await assertReadAccess(file, actor);
  const buffer = await adapter.load(file.path);

  return {
    file,
    buffer
  };
}
