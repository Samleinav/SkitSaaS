import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ModuleManifest } from '../../app/sdk/src/modules/manifest';

export async function loadOptionalPrivateModuleManifest(
  relativePathFromRepoRoot: string
): Promise<ModuleManifest | null> {
  const absolutePath = path.resolve(process.cwd(), relativePathFromRepoRoot);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const imported = (await import(pathToFileURL(absolutePath).href)) as {
    default?: ModuleManifest;
  };

  return imported.default ?? null;
}
