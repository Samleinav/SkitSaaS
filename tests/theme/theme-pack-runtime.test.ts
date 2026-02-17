import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { ExternalThemePack } from '../../lib/themes/external.generated';
import {
  getExternalThemeTokensCssBySelection,
  resolveExternalThemePackBySelection
} from '../../lib/themes/runtime';

function makePack(
  overrides: Partial<ExternalThemePack> & Pick<ExternalThemePack, 'themeId'>
): ExternalThemePack {
  return {
    themeId: overrides.themeId,
    version: overrides.version ?? '1.0.0',
    areas: overrides.areas ?? ['global'],
    mode: overrides.mode ?? 'tokens',
    entryTokens: overrides.entryTokens ?? 'tokens.css',
    themeRange: overrides.themeRange ?? '^1.0.0',
    packDir: overrides.packDir ?? 'themes/default',
    entryTokensPath: overrides.entryTokensPath ?? 'themes/default/tokens.css',
    entryTemplatesPath: overrides.entryTemplatesPath ?? null,
    entryAssetsPath: overrides.entryAssetsPath ?? null,
    displayName: overrides.displayName,
    description: overrides.description,
    author: overrides.author,
    tags: overrides.tags,
    themeCompatible: overrides.themeCompatible ?? true,
    codeTemplates: overrides.codeTemplates ?? [],
    hasThemeConfig: overrides.hasThemeConfig ?? false,
    hasFrontendRoutes: overrides.hasFrontendRoutes ?? false,
    frontendRoutesImportPath: overrides.frontendRoutesImportPath ?? null
  };
}

test('resolveExternalThemePackBySelection respects area and global fallback', () => {
  const adminPack = makePack({
    themeId: 'theme.admin.core',
    areas: ['admin']
  });
  const globalPack = makePack({
    themeId: 'theme.global.core',
    areas: ['global']
  });

  assert.equal(
    resolveExternalThemePackBySelection({
      themeId: adminPack.themeId,
      area: 'admin',
      packs: [adminPack, globalPack]
    })?.themeId,
    adminPack.themeId
  );

  assert.equal(
    resolveExternalThemePackBySelection({
      themeId: globalPack.themeId,
      area: 'dashboard',
      packs: [adminPack, globalPack]
    })?.themeId,
    globalPack.themeId
  );

  assert.equal(
    resolveExternalThemePackBySelection({
      themeId: adminPack.themeId,
      area: 'dashboard',
      packs: [adminPack, globalPack]
    }),
    null
  );
});

test('resolveExternalThemePackBySelection maps legacy public area to frontend pack', () => {
  const frontendPack = makePack({
    themeId: 'theme.frontend.core',
    areas: ['frontend']
  });

  const selected = resolveExternalThemePackBySelection({
    themeId: frontendPack.themeId,
    area: 'public',
    packs: [frontendPack]
  });

  assert.equal(selected?.themeId, frontendPack.themeId);
});

test('getExternalThemeTokensCssBySelection reads css from resolved pack', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-pack-runtime-'));
  const relativeTokensPath = path.join('themes', 'frontend', 'tokens.css');
  const absoluteTokensPath = path.join(tempRoot, relativeTokensPath);

  fs.mkdirSync(path.dirname(absoluteTokensPath), { recursive: true });
  fs.writeFileSync(absoluteTokensPath, ':root{--x:1;}', 'utf8');

  const frontendPack = makePack({
    themeId: 'theme.frontend.core',
    areas: ['frontend'],
    entryTokensPath: relativeTokensPath
  });

  const css = getExternalThemeTokensCssBySelection({
    themeId: frontendPack.themeId,
    area: 'frontend',
    packs: [frontendPack],
    rootDir: tempRoot
  });

  assert.equal(css, ':root{--x:1;}');
});

test('getExternalThemeTokensCssBySelection returns null when pack or file is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-pack-runtime-'));
  const frontendPack = makePack({
    themeId: 'theme.frontend.core',
    areas: ['frontend'],
    entryTokensPath: path.join('themes', 'frontend', 'missing.css')
  });

  const missingFileCss = getExternalThemeTokensCssBySelection({
    themeId: frontendPack.themeId,
    area: 'frontend',
    packs: [frontendPack],
    rootDir: tempRoot
  });
  const missingPackCss = getExternalThemeTokensCssBySelection({
    themeId: 'theme.unknown',
    area: 'frontend',
    packs: [frontendPack],
    rootDir: tempRoot
  });

  assert.equal(missingFileCss, null);
  assert.equal(missingPackCss, null);
});
