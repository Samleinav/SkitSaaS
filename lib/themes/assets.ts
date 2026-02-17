import fs from 'node:fs';
import path from 'node:path';
import type { ThemeArea } from '@/lib/theme';
import type { ThemeConfig } from '@/lib/themes/config';
import { THEME_CODE_REGISTRY } from '@/lib/themes/code-registry.generated';
import {
  EXTERNAL_THEME_PACKS,
  type ExternalThemePack
} from '@/lib/themes/external.generated';
import { resolveExternalThemePackBySelection } from '@/lib/themes/runtime';

type ThemeAssetArea = 'admin' | 'dashboard' | 'frontend' | 'global';

type ThemeAreaAssetMap = Partial<Record<ThemeAssetArea, string>>;
type ThemeAreaTemplateMap = Partial<Record<ThemeAssetArea, string>>;

export type ThemePackAssetsManifest = {
  globalCssByArea?: ThemeAreaAssetMap;
  scriptByArea?: ThemeAreaAssetMap;
  faviconByArea?: ThemeAreaAssetMap;
  notFoundTemplateByArea?: ThemeAreaTemplateMap;
  loginThemeAreaByPath?: Record<string, 'admin' | 'dashboard'>;
};

type ResolvedThemeAssets = {
  pack: ExternalThemePack;
  globalCssAbsolutePath: string | null;
  faviconAbsolutePath: string | null;
  notFoundTemplateId: string | null;
  loginThemeAreaByPath: Record<string, 'admin' | 'dashboard'>;
};

const THEME_ASSET_AREAS = new Set<ThemeAssetArea>([
  'admin',
  'dashboard',
  'frontend',
  'global'
]);
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const configAssetsManifestCache = new Map<
  string,
  Promise<ThemePackAssetsManifest | null>
>();
const globalCssCache = new Map<string, string | null>();
const faviconDataUrlCache = new Map<string, string | null>();

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAssetArea(area: ThemeArea): ThemeAssetArea {
  if (area === 'public') {
    return 'frontend';
  }

  if (
    area === 'admin' ||
    area === 'dashboard' ||
    area === 'frontend' ||
    area === 'global'
  ) {
    return area;
  }

  return 'global';
}

function normalizeAreaAssetMap(value: unknown): ThemeAreaAssetMap | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normalized: ThemeAreaAssetMap = {};
  for (const [rawArea, rawPath] of Object.entries(value)) {
    const area = rawArea.trim().toLowerCase();
    if (!THEME_ASSET_AREAS.has(area as ThemeAssetArea)) {
      continue;
    }

    if (typeof rawPath !== 'string') {
      continue;
    }

    const assetPath = rawPath.trim();
    if (!assetPath) {
      continue;
    }

    normalized[area as ThemeAssetArea] = assetPath;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeAreaTemplateMap(
  value: unknown
): ThemeAreaTemplateMap | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normalized: ThemeAreaTemplateMap = {};
  for (const [rawArea, rawTemplateId] of Object.entries(value)) {
    const area = rawArea.trim().toLowerCase();
    if (!THEME_ASSET_AREAS.has(area as ThemeAssetArea)) {
      continue;
    }

    if (typeof rawTemplateId !== 'string') {
      continue;
    }

    const templateId = rawTemplateId.trim().toLowerCase();
    if (!templateId) {
      continue;
    }

    normalized[area as ThemeAssetArea] = templateId;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeLoginThemeAreaByPath(
  value: unknown
): Record<string, 'admin' | 'dashboard'> {
  if (!isObject(value)) {
    return {};
  }

  const normalized: Record<string, 'admin' | 'dashboard'> = {};
  for (const [rawPath, rawArea] of Object.entries(value)) {
    const routePath = rawPath.trim().toLowerCase();
    if (!routePath.startsWith('/')) {
      continue;
    }

    if (rawArea === 'admin' || rawArea === 'dashboard') {
      normalized[routePath] = rawArea;
    }
  }

  return normalized;
}

function normalizeThemeAssetsManifest(raw: unknown): ThemePackAssetsManifest {
  if (!isObject(raw)) {
    return {};
  }

  return {
    globalCssByArea: normalizeAreaAssetMap(raw.globalCssByArea),
    scriptByArea: normalizeAreaAssetMap(raw.scriptByArea),
    faviconByArea: normalizeAreaAssetMap(raw.faviconByArea),
    notFoundTemplateByArea: normalizeAreaTemplateMap(raw.notFoundTemplateByArea),
    loginThemeAreaByPath: normalizeLoginThemeAreaByPath(raw.loginThemeAreaByPath)
  };
}

async function readThemeAssetsManifestFromConfig(themeId: string) {
  if (configAssetsManifestCache.has(themeId)) {
    return configAssetsManifestCache.get(themeId) ?? null;
  }

  const manifestPromise = (async () => {
    const codeRegistryEntry = THEME_CODE_REGISTRY[themeId];
    if (!codeRegistryEntry?.configImport) {
      return null;
    }

    try {
      const configModule = await codeRegistryEntry.configImport();
      const config = configModule.default;
      if (!isObject(config)) {
        return null;
      }

      const assets = (config as ThemeConfig).assets;
      if (!assets) {
        return null;
      }

      return normalizeThemeAssetsManifest(assets);
    } catch {
      return null;
    }
  })();

  configAssetsManifestCache.set(themeId, manifestPromise);
  return manifestPromise;
}

function resolvePackRelativeFilePath({
  pack,
  rootDir,
  relativeFilePath
}: {
  pack: ExternalThemePack;
  rootDir: string;
  relativeFilePath: string | null;
}) {
  if (!relativeFilePath) {
    return null;
  }

  if (path.isAbsolute(relativeFilePath)) {
    return null;
  }

  const packRoot = path.resolve(rootDir, pack.packDir);
  const absolutePath = path.resolve(packRoot, relativeFilePath);
  const relativeToPack = path.relative(packRoot, absolutePath);

  if (
    relativeToPack.startsWith('..') ||
    path.isAbsolute(relativeToPack)
  ) {
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

function resolveAreaAssetPath(
  assetsByArea: ThemeAreaAssetMap | undefined,
  area: ThemeAssetArea
) {
  if (!assetsByArea) {
    return null;
  }

  return assetsByArea[area] ?? assetsByArea.global ?? null;
}

function resolveAreaTemplateId(
  templatesByArea: ThemeAreaTemplateMap | undefined,
  area: ThemeAssetArea
) {
  if (!templatesByArea) {
    return null;
  }

  return templatesByArea[area] ?? templatesByArea.global ?? null;
}

function resolveThemeAssetsFromManifest({
  manifest,
  pack,
  area,
  rootDir
}: {
  manifest: ThemePackAssetsManifest;
  pack: ExternalThemePack;
  area: ThemeArea;
  rootDir: string;
}): ResolvedThemeAssets {
  const normalizedArea = normalizeAssetArea(area);
  const globalCssRelativePath = resolveAreaAssetPath(
    manifest.globalCssByArea,
    normalizedArea
  );
  const faviconRelativePath = resolveAreaAssetPath(
    manifest.faviconByArea,
    normalizedArea
  );

  return {
    pack,
    globalCssAbsolutePath: resolvePackRelativeFilePath({
      pack,
      rootDir,
      relativeFilePath: globalCssRelativePath
    }),
    faviconAbsolutePath: resolvePackRelativeFilePath({
      pack,
      rootDir,
      relativeFilePath: faviconRelativePath
    }),
    notFoundTemplateId: resolveAreaTemplateId(
      manifest.notFoundTemplateByArea,
      normalizedArea
    ),
    loginThemeAreaByPath: manifest.loginThemeAreaByPath ?? {}
  };
}

async function resolveThemeAssetsBySelection({
  themeId,
  area,
  packs = EXTERNAL_THEME_PACKS,
  rootDir = process.cwd()
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
  rootDir?: string;
}) {
  const pack = resolveExternalThemePackBySelection({ themeId, area, packs });
  if (!pack) {
    return null;
  }

  const manifest = await readThemeAssetsManifestFromConfig(pack.themeId);
  if (!manifest) {
    return null;
  }

  return resolveThemeAssetsFromManifest({
    manifest,
    pack,
    area,
    rootDir
  });
}

export async function readExternalThemeGlobalCssBySelectionFromConfig({
  themeId,
  area,
  packs,
  rootDir
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
  rootDir?: string;
}) {
  const resolved = await resolveThemeAssetsBySelection({
    themeId,
    area,
    packs,
    rootDir
  });
  const cssPath = resolved?.globalCssAbsolutePath;
  if (!cssPath) {
    return null;
  }

  if (globalCssCache.has(cssPath)) {
    return globalCssCache.get(cssPath) ?? null;
  }

  try {
    const css = fs.readFileSync(cssPath, 'utf8');
    globalCssCache.set(cssPath, css);
    return css;
  } catch {
    globalCssCache.set(cssPath, null);
    return null;
  }
}

export async function getExternalThemeFaviconDataUrlBySelectionFromConfig({
  themeId,
  area,
  packs,
  rootDir
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
  rootDir?: string;
}) {
  const resolved = await resolveThemeAssetsBySelection({
    themeId,
    area,
    packs,
    rootDir
  });
  const faviconPath = resolved?.faviconAbsolutePath;
  if (!faviconPath) {
    return null;
  }

  if (faviconDataUrlCache.has(faviconPath)) {
    return faviconDataUrlCache.get(faviconPath) ?? null;
  }

  try {
    const iconBuffer = fs.readFileSync(faviconPath);
    const extension = path.extname(faviconPath).toLowerCase();
    const mimeType =
      IMAGE_MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
    faviconDataUrlCache.set(faviconPath, dataUrl);
    return dataUrl;
  } catch {
    faviconDataUrlCache.set(faviconPath, null);
    return null;
  }
}

export async function getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
  themeId,
  area,
  packs,
  rootDir
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
  rootDir?: string;
}) {
  const resolved = await resolveThemeAssetsBySelection({
    themeId,
    area,
    packs,
    rootDir
  });
  return resolved?.notFoundTemplateId ?? null;
}

export async function resolveLoginThemeAreaByPathFromSelectionFromConfig({
  themeId,
  area,
  pathName,
  packs,
  rootDir
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  pathName: string;
  packs?: ExternalThemePack[];
  rootDir?: string;
}) {
  const resolved = await resolveThemeAssetsBySelection({
    themeId,
    area,
    packs,
    rootDir
  });
  if (!resolved) {
    return null;
  }

  const normalizedPath = pathName.trim().toLowerCase();
  if (!normalizedPath.startsWith('/')) {
    return null;
  }

  return resolved.loginThemeAreaByPath[normalizedPath] ?? null;
}
