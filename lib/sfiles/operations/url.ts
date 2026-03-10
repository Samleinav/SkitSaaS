import type { SFilesAdapter, SFilesActorContext, GetUrlOptions } from '@skitsaas/sdk/sfiles';
import { getSfileById } from '../db';
import { assertReadAccess } from '../permissions';

export async function urlOperation(
  id: number,
  actor: SFilesActorContext,
  adapter: SFilesAdapter,
  options: GetUrlOptions = {},
  defaultExpiresIn: number
): Promise<string> {
  const file = await getSfileById(id);
  if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });

  await assertReadAccess(file, actor);

  const expiresIn = options.expiresIn ?? defaultExpiresIn;

  if (file.visibility === 'public') {
    return adapter.getPublicUrl(file.path);
  }

  return adapter.getSignedUrl(file.path, expiresIn);
}
