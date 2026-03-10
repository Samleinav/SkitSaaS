import { lookup } from 'mime-types';
import type {
  SFile,
  SFileBackend,
  SFilesAdapter,
  SFilesActorContext,
  UploadOptions,
} from '@skitsaas/sdk/sfiles';
import { insertSfile } from '../db';

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
}

function normalizeFolder(folder: string): string {
  let f = folder.startsWith('/') ? folder : `/${folder}`;
  if (!f.endsWith('/')) f = `${f}/`;
  return f;
}

export async function uploadOperation(
  file: File | Buffer,
  filename: string,
  backend: SFileBackend,
  adapter: SFilesAdapter,
  options: UploadOptions = {},
  actor?: SFilesActorContext
): Promise<SFile> {
  const { folder = '/', visibility = 'private', ownerId, metadata } = options;
  const normalizedFolder = normalizeFolder(folder);
  const safeName = sanitizeName(filename);
  const storagePath = `${normalizedFolder.slice(1)}${crypto.randomUUID()}_${safeName}`;

  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file as Buffer;
  } else {
    buffer = Buffer.from(await (file as File).arrayBuffer());
  }

  const mimeType = (lookup(filename) || 'application/octet-stream') as string;
  const { etag } = await adapter.save(buffer, storagePath);

  const resolvedOwnerId = ownerId !== undefined ? ownerId : (actor?.userId ?? null);

  return insertSfile({
    name: filename,
    originalName: filename,
    path: storagePath,
    folder: normalizedFolder,
    mimeType,
    size: buffer.byteLength,
    backend,
    etag,
    ownerId: resolvedOwnerId,
    visibility,
    metadata: metadata ?? null,
  });
}
