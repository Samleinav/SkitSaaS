import type { ISfilesManager } from '@skitsaas/sdk/sfiles';
import { registerSfiles } from '@skitsaas/sdk/sfiles';
import { getSfilesConfig } from './config';
import { LocalAdapter } from './adapters/local';
import { S3Adapter } from './adapters/s3';
import { SfilesManager } from './manager';

export function createSfiles(): ISfilesManager {
  const config = getSfilesConfig();
  const adapter = config.backend === 's3' ? new S3Adapter(config) : new LocalAdapter(config);
  return new SfilesManager(adapter, config);
}

/**
 * Singleton Sfiles manager for use in server-side code.
 * Also registered in @skitsaas/sdk/sfiles so modules can call getSfiles() without @/ alias.
 *
 * @example
 * import { sfiles } from '@/lib/sfiles';                    // host app
 * import { getSfiles } from '@skitsaas/sdk/sfiles';          // modules
 */
export const sfiles = createSfiles();

// Register in SDK service locator — modules call getSfiles() from @skitsaas/sdk/sfiles
registerSfiles(sfiles);

// Re-export types for convenience
export type {
  SFile,
  SFileBackend,
  SFilePermission,
  SFileVisibility,
  SFilesActorContext,
  ISfilesManager,
  UploadOptions,
  ListOptions,
  ListResult,
  SearchOptions,
  GetUrlOptions,
  ZipOptions,
  RenameOptions,
  MoveOptions,
  SetPermissionsOptions,
} from '@skitsaas/sdk/sfiles';
