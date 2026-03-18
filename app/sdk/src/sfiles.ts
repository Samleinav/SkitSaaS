// ─── Backend & Visibility ────────────────────────────────────────────────────

export type SFileBackend = 'local' | 's3';

export type SFileVisibility =
  | 'private'        // owner + admins only
  | 'users'          // owner + admins + explicit grants in sfiles_permissions
  | 'authenticated'  // any authenticated user
  | 'public'         // anyone (no auth required)
  | 'admin';         // admins only (not even the owner unless they are admin)

// ─── Core record types ───────────────────────────────────────────────────────

export type SFile = {
  id: number;
  name: string;              // current name (mutable via rename)
  originalName: string;      // upload-time filename
  path: string;              // storage path: relative fs path or S3 object key
  folder: string;            // logical folder, always starts+ends with '/', e.g. '/uploads/images/'
  mimeType: string;
  size: number;              // bytes
  backend: SFileBackend;
  bucket: string | null;     // S3 bucket name; null for local backend
  etag: string | null;       // S3 ETag or MD5 hash for local files
  ownerId: number | null;    // user ID who uploaded; null = system-owned file
  visibility: SFileVisibility;
  metadata: Record<string, unknown> | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SFilePermission = {
  id: number;
  fileId: number;
  userId: number;
  grantedAt: Date;
};

export type SFileReadResult = {
  file: SFile;
  buffer: Buffer;
};

// ─── Config ─────────────────────────────────────────────────────────────────

export type SFilesConfig = {
  backend: SFileBackend;
  localRoot: string;          // root directory for local backend
  urlBase: string;            // base URL used for local file serving URLs
  signedUrlExpireSeconds: number;
  // S3 / compatible (MinIO, Cloudflare R2)
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Endpoint?: string;        // optional custom endpoint
};

// ─── Actor context (who is performing the operation) ────────────────────────

export type SFilesActorContext = {
  userId: number | null;  // null = unauthenticated
  isAdmin: boolean;
};

// ─── Operation options & results ─────────────────────────────────────────────

export type UploadOptions = {
  folder?: string;
  visibility?: SFileVisibility;
  ownerId?: number | null;
  metadata?: Record<string, unknown>;
};

export type ListOptions = {
  folder?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
};

export type ListResult = {
  files: SFile[];
  folders: string[];  // unique sub-folder paths found within the queried folder
  total: number;
};

export type SearchOptions = {
  query: string;
  folder?: string;
  page?: number;
  limit?: number;
};

export type GetUrlOptions = {
  expiresIn?: number;  // seconds; defaults to config.signedUrlExpireSeconds
};

export type ZipOptions = {
  fileIds: number[];
  archiveName?: string;  // defaults to 'archive.zip'
};

export type RenameOptions = {
  name: string;
};

export type MoveOptions = {
  folder: string;
};

export type SetPermissionsOptions = {
  userIds: number[];  // replaces all existing grants for this file
};

// ─── Storage adapter interface (backend contract) ────────────────────────────

export interface SFilesAdapter {
  /** Write buffer to storage, return etag/checksum (or null if unavailable) */
  save(buffer: Buffer, storagePath: string): Promise<{ etag: string | null }>;
  /** Read file from storage into Buffer */
  load(storagePath: string): Promise<Buffer>;
  /** Delete file from storage */
  remove(storagePath: string): Promise<void>;
  /** Check if a file exists in storage */
  exists(storagePath: string): Promise<boolean>;
  /** Return a permanent public URL (for public files) */
  getPublicUrl(storagePath: string): string;
  /** Return a time-limited signed URL */
  getSignedUrl(storagePath: string, expiresIn: number): Promise<string>;
}

// ─── Manager interface (public API for modules/callers) ──────────────────────

export interface ISfilesManager {
  /** Upload a file. ownerId defaults to actor.userId if not set in options. */
  upload(
    file: File | Buffer,
    filename: string,
    options?: UploadOptions,
    actor?: SFilesActorContext
  ): Promise<SFile>;

  /** List files and sub-folders visible to actor in a folder */
  list(actor: SFilesActorContext, options?: ListOptions): Promise<ListResult>;

  /** Get a single file record (throws if not found or no access) */
  get(actor: SFilesActorContext, id: number): Promise<SFile>;

  /** Load the file binary after permission checks. */
  read(actor: SFilesActorContext, id: number): Promise<SFileReadResult>;

  /** Soft-delete a file (owner or admin only) */
  delete(actor: SFilesActorContext, id: number): Promise<void>;

  /** Full-text search on file names visible to actor */
  search(actor: SFilesActorContext, options: SearchOptions): Promise<SFile[]>;

  /** Rename a file (owner or admin only) */
  rename(actor: SFilesActorContext, id: number, options: RenameOptions): Promise<SFile>;

  /** Move a file to a different folder (owner or admin only) */
  move(actor: SFilesActorContext, id: number, options: MoveOptions): Promise<SFile>;

  /** Get a URL to access the file (signed URL for S3, serve URL for local) */
  getUrl(actor: SFilesActorContext, id: number, options?: GetUrlOptions): Promise<string>;

  /** Create a ZIP archive from multiple files and save it as a new file */
  zip(actor: SFilesActorContext, options: ZipOptions): Promise<SFile>;

  /** Replace all per-user grants for a file (owner or admin only) */
  setPermissions(
    actor: SFilesActorContext,
    fileId: number,
    options: SetPermissionsOptions
  ): Promise<void>;

  /** List all per-user grants for a file (owner or admin only) */
  getPermissions(actor: SFilesActorContext, fileId: number): Promise<SFilePermission[]>;
}

export interface ActorBoundSfilesManager {
  upload(
    file: File | Buffer,
    filename: string,
    options?: UploadOptions
  ): Promise<SFile>;
  list(options?: ListOptions): Promise<ListResult>;
  get(id: number): Promise<SFile>;
  read(id: number): Promise<SFileReadResult>;
  delete(id: number): Promise<void>;
  search(options: SearchOptions): Promise<SFile[]>;
  rename(id: number, options: RenameOptions): Promise<SFile>;
  move(id: number, options: MoveOptions): Promise<SFile>;
  getUrl(id: number, options?: GetUrlOptions): Promise<string>;
  zip(options: ZipOptions): Promise<SFile>;
  setPermissions(fileId: number, options: SetPermissionsOptions): Promise<void>;
  getPermissions(fileId: number): Promise<SFilePermission[]>;
}

// ─── Service locator ─────────────────────────────────────────────────────────
// The host app calls registerSfiles() once (lib/sfiles/index.ts).
// Modules import { sfiles } from '@skitsaas/sdk/sfiles' and use it directly.

let _instance: ISfilesManager | null = null;

function readRegisteredSfiles(): ISfilesManager {
  if (!_instance) {
    throw new Error(
      '[Sfiles] Not initialized. Ensure the host loads lib/sfiles before ' +
        'using @skitsaas/sdk/sfiles.'
    );
  }

  return _instance;
}

/**
 * Register the Sfiles singleton. Called once by the host app in lib/sfiles/index.ts.
 */
export function registerSfiles(instance: ISfilesManager): void {
  _instance = instance;
}

/**
 * Bind a resolved actor context to the public manager so callers no longer
 * repeat the actor parameter on every operation.
 */
export function bindSfilesActor(
  actor: SFilesActorContext,
  manager: ISfilesManager = readRegisteredSfiles()
): ActorBoundSfilesManager {
  return {
    upload(file, filename, options) {
      return manager.upload(file, filename, options, actor);
    },
    list(options) {
      return manager.list(actor, options);
    },
    get(id) {
      return manager.get(actor, id);
    },
    read(id) {
      return manager.read(actor, id);
    },
    delete(id) {
      return manager.delete(actor, id);
    },
    search(options) {
      return manager.search(actor, options);
    },
    rename(id, options) {
      return manager.rename(actor, id, options);
    },
    move(id, options) {
      return manager.move(actor, id, options);
    },
    getUrl(id, options) {
      return manager.getUrl(actor, id, options);
    },
    zip(options) {
      return manager.zip(actor, options);
    },
    setPermissions(fileId, options) {
      return manager.setPermissions(actor, fileId, options);
    },
    getPermissions(fileId) {
      return manager.getPermissions(actor, fileId);
    }
  };
}

/**
 * Sfiles singleton — import and use directly from any module or server-side code.
 * The host must have imported lib/sfiles before any method is called.
 *
 * @example
 * import { sfiles } from '@skitsaas/sdk/sfiles';
 * await sfiles.upload(buffer, 'file.pdf', { folder: '/docs/' }, actor);
 */
export const sfiles: ISfilesManager = new Proxy({} as ISfilesManager, {
  get(_target, prop: string) {
    return (readRegisteredSfiles() as unknown as Record<string, unknown>)[prop];
  },
});
