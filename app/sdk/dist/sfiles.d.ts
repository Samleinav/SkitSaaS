export type SFileBackend = 'local' | 's3';
export type SFileVisibility = 'private' | 'users' | 'authenticated' | 'public' | 'admin';
export type SFile = {
    id: number;
    name: string;
    originalName: string;
    path: string;
    folder: string;
    mimeType: string;
    size: number;
    backend: SFileBackend;
    bucket: string | null;
    etag: string | null;
    ownerId: number | null;
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
export type SFilesConfig = {
    backend: SFileBackend;
    localRoot: string;
    urlBase: string;
    signedUrlExpireSeconds: number;
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3Endpoint?: string;
};
export type SFilesActorContext = {
    userId: number | null;
    isAdmin: boolean;
};
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
    folders: string[];
    total: number;
};
export type SearchOptions = {
    query: string;
    folder?: string;
    page?: number;
    limit?: number;
};
export type GetUrlOptions = {
    expiresIn?: number;
};
export type ZipOptions = {
    fileIds: number[];
    archiveName?: string;
};
export type RenameOptions = {
    name: string;
};
export type MoveOptions = {
    folder: string;
};
export type SetPermissionsOptions = {
    userIds: number[];
};
export interface SFilesAdapter {
    /** Write buffer to storage, return etag/checksum (or null if unavailable) */
    save(buffer: Buffer, storagePath: string): Promise<{
        etag: string | null;
    }>;
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
export interface ISfilesManager {
    /** Upload a file. ownerId defaults to actor.userId if not set in options. */
    upload(file: File | Buffer, filename: string, options?: UploadOptions, actor?: SFilesActorContext): Promise<SFile>;
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
    setPermissions(actor: SFilesActorContext, fileId: number, options: SetPermissionsOptions): Promise<void>;
    /** List all per-user grants for a file (owner or admin only) */
    getPermissions(actor: SFilesActorContext, fileId: number): Promise<SFilePermission[]>;
}
export interface ActorBoundSfilesManager {
    upload(file: File | Buffer, filename: string, options?: UploadOptions): Promise<SFile>;
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
/**
 * Register the Sfiles singleton. Called once by the host app in lib/sfiles/index.ts.
 */
export declare function registerSfiles(instance: ISfilesManager): void;
/**
 * Bind a resolved actor context to the public manager so callers no longer
 * repeat the actor parameter on every operation.
 */
export declare function bindSfilesActor(actor: SFilesActorContext, manager?: ISfilesManager): ActorBoundSfilesManager;
/**
 * Sfiles singleton — import and use directly from any module or server-side code.
 * The host must have imported lib/sfiles before any method is called.
 *
 * @example
 * import { sfiles } from '@skitsaas/sdk/sfiles';
 * await sfiles.upload(buffer, 'file.pdf', { folder: '/docs/' }, actor);
 */
export declare const sfiles: ISfilesManager;
