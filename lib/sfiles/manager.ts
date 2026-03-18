import type {
  ISfilesManager,
  SFile,
  SFileBackend,
  SFilePermission,
  SFileReadResult,
  SFilesAdapter,
  SFilesActorContext,
  SFilesConfig,
  GetUrlOptions,
  ListOptions,
  ListResult,
  MoveOptions,
  RenameOptions,
  SearchOptions,
  SetPermissionsOptions,
  UploadOptions,
  ZipOptions,
} from '@skitsaas/sdk/sfiles';
import { getSfileById, getPermissions, setPermissions } from './db';
import { assertReadAccess, assertWriteAccess } from './permissions';
import { uploadOperation } from './operations/upload';
import { listOperation } from './operations/list';
import { deleteOperation } from './operations/delete';
import { searchOperation } from './operations/search';
import { renameOperation } from './operations/rename';
import { moveOperation } from './operations/move';
import { urlOperation } from './operations/url';
import { zipOperation } from './operations/zip';
import { readOperation } from './operations/read';

export class SfilesManager implements ISfilesManager {
  private readonly backend: SFileBackend;

  constructor(
    private readonly adapter: SFilesAdapter,
    private readonly config: SFilesConfig
  ) {
    this.backend = config.backend;
  }

  async upload(
    file: File | Buffer,
    filename: string,
    options?: UploadOptions,
    actor?: SFilesActorContext
  ): Promise<SFile> {
    return uploadOperation(file, filename, this.backend, this.adapter, options, actor);
  }

  async list(actor: SFilesActorContext, options?: ListOptions): Promise<ListResult> {
    return listOperation(actor, options);
  }

  async get(actor: SFilesActorContext, id: number): Promise<SFile> {
    const file = await getSfileById(id);
    if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });
    await assertReadAccess(file, actor);
    return file;
  }

  async read(actor: SFilesActorContext, id: number): Promise<SFileReadResult> {
    return readOperation(id, actor, this.adapter);
  }

  async delete(actor: SFilesActorContext, id: number): Promise<void> {
    return deleteOperation(id, actor, this.adapter);
  }

  async search(actor: SFilesActorContext, options: SearchOptions): Promise<SFile[]> {
    return searchOperation(actor, options);
  }

  async rename(actor: SFilesActorContext, id: number, options: RenameOptions): Promise<SFile> {
    return renameOperation(id, actor, options);
  }

  async move(actor: SFilesActorContext, id: number, options: MoveOptions): Promise<SFile> {
    return moveOperation(id, actor, options);
  }

  async getUrl(
    actor: SFilesActorContext,
    id: number,
    options?: GetUrlOptions
  ): Promise<string> {
    return urlOperation(id, actor, this.adapter, options, this.config.signedUrlExpireSeconds);
  }

  async zip(actor: SFilesActorContext, options: ZipOptions): Promise<SFile> {
    return zipOperation(actor, this.backend, this.adapter, options);
  }

  async setPermissions(
    actor: SFilesActorContext,
    fileId: number,
    options: SetPermissionsOptions
  ): Promise<void> {
    const file = await getSfileById(fileId);
    if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });
    assertWriteAccess(file, actor);
    await setPermissions(fileId, options.userIds);
  }

  async getPermissions(
    actor: SFilesActorContext,
    fileId: number
  ): Promise<SFilePermission[]> {
    const file = await getSfileById(fileId);
    if (!file) throw Object.assign(new Error('File not found'), { code: 'NOT_FOUND' });
    assertWriteAccess(file, actor);
    return getPermissions(fileId);
  }
}
