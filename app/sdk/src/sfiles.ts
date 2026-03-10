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

// ─── Service locator ─────────────────────────────────────────────────────────
// The host app calls registerSfiles() once (lib/sfiles/index.ts).
// Modules import { sfiles } from '@skitsaas/sdk/sfiles' and use it directly.

let _instance: ISfilesManager | null = null;

/**
 * Register the Sfiles singleton. Called once by the host app in lib/sfiles/index.ts.
 */
export function registerSfiles(instance: ISfilesManager): void {
  _instance = instance;
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
    if (!_instance) {
      throw new Error(
        `[Sfiles] Not initialized — cannot call sfiles.${prop}(). ` +
        'Ensure lib/sfiles is loaded before using sfiles from the SDK.'
      );
    }
    return (_instance as unknown as Record<string, unknown>)[prop];
  },
});
