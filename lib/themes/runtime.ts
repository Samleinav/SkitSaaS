import fs from 'node:fs';
import path from 'node:path';
import { type ThemeArea } from '@/lib/theme';
import { THEME_TOKENS_STYLE_ID } from '@/lib/themes/constants';
import {
  EXTERNAL_THEME_PACKS,
  type ExternalThemePack
} from '@/lib/themes/external.generated';

type ThemeRuntimeArea = 'admin' | 'dashboard' | 'frontend' | 'global';

function normalizeRuntimeArea(area: ThemeArea): ThemeRuntimeArea {
  if (area === 'public' || area === 'frontend') {
    return 'frontend';
  }

  return area;
}

export { THEME_TOKENS_STYLE_ID };

const tokensFileCache = new Map<string, string | null>();

export function resolveExternalThemePackBySelection({
  themeId,
  area,
  packs = EXTERNAL_THEME_PACKS
}: {
  themeId: string | null | undefined;
  area: ThemeArea;
  packs?: ExternalThemePack[];
}) {
  if (!themeId) {
    return null;
  }

  const normalizedArea = normalizeRuntimeArea(area);
  const candidate = packs.find((pack) => pack.themeId === themeId);
  if (!candidate) {
    return null;
  }

  if (candidate.areas.includes(normalizedArea)) {
    return candidate;
  }

  if (candidate.areas.includes('global')) {
    return candidate;
  }

  return null;
}

export function readExternalThemeTokensCss(
  pack: ExternalThemePack,
  options?: { rootDir?: string }
) {
  const rootDir = options?.rootDir ?? process.cwd();
  const tokensAbsolutePath = path.join(rootDir, pack.entryTokensPath);

  if (tokensFileCache.has(tokensAbsolutePath)) {
    return tokensFileCache.get(tokensAbsolutePath) ?? null;
  }

  if (!fs.existsSync(tokensAbsolutePath)) {
    tokensFileCache.set(tokensAbsolutePath, null);
    return null;
  }

  try {
    const css = fs.readFileSync(tokensAbsolutePath, 'utf8');
    tokensFileCache.set(tokensAbsolutePath, css);
    return css;
  } catch {
    tokensFileCache.set(tokensAbsolutePath, null);
    return null;
  }
}

export function getExternalThemeTokensCssBySelection({
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
  const pack = resolveExternalThemePackBySelection({
    themeId,
    area,
    packs
  });

  if (!pack) {
    return null;
  }

  return readExternalThemeTokensCss(pack, { rootDir });
}
