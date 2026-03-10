import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import type {
  SFile,
  SFileBackend,
  SFilesAdapter,
  SFilesActorContext,
  ZipOptions,
} from '@skitsaas/sdk/sfiles';
import { getSfileById } from '../db';
import { assertReadAccess } from '../permissions';
import { uploadOperation } from './upload';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function zipOperation(
  actor: SFilesActorContext,
  backend: SFileBackend,
  adapter: SFilesAdapter,
  options: ZipOptions
): Promise<SFile> {
  const { fileIds, archiveName = 'archive.zip' } = options;

  if (fileIds.length === 0) throw new Error('No file IDs provided for ZIP');

  // Load and permission-check each file
  const files = await Promise.all(
    fileIds.map(async (id) => {
      const file = await getSfileById(id);
      if (!file) throw Object.assign(new Error(`File ${id} not found`), { code: 'NOT_FOUND' });
      await assertReadAccess(file, actor);
      return file;
    })
  );

  // Build ZIP in memory
  const archive = archiver('zip', { zlib: { level: 6 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  for (const file of files) {
    const fileBuffer = await adapter.load(file.path);
    archive.append(fileBuffer, { name: file.name });
  }

  await archive.finalize();
  const zipBuffer = await streamToBuffer(passthrough);

  // Upload the ZIP as a new file
  return uploadOperation(zipBuffer, archiveName, backend, adapter, {
    folder: '/zips/',
    visibility: 'private',
    ownerId: actor.userId,
  });
}
