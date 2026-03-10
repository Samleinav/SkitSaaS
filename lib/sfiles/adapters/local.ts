import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SFilesAdapter, SFilesConfig } from '@skitsaas/sdk/sfiles';

export class LocalAdapter implements SFilesAdapter {
  constructor(private readonly config: SFilesConfig) {}

  private resolvePath(storagePath: string): string {
    return join(this.config.localRoot, storagePath);
  }

  async save(buffer: Buffer, storagePath: string): Promise<{ etag: string | null }> {
    const fullPath = this.resolvePath(storagePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    const etag = createHash('md5').update(buffer).digest('hex');
    return { etag };
  }

  async load(storagePath: string): Promise<Buffer> {
    return readFile(this.resolvePath(storagePath));
  }

  async remove(storagePath: string): Promise<void> {
    try {
      await unlink(this.resolvePath(storagePath));
    } catch (err: unknown) {
      // Ignore if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await readFile(this.resolvePath(storagePath));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(storagePath: string): string {
    return `${this.config.urlBase}/api/sfiles/serve/${storagePath}`;
  }

  async getSignedUrl(storagePath: string, _expiresIn: number): Promise<string> {
    // Local files are served via the API — same URL as public
    return this.getPublicUrl(storagePath);
  }
}
