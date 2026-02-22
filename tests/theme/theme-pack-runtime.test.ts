import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { EXTERNAL_THEME_PACKS } from '../../lib/themes/external.generated';
import type { ExternalThemePack } from '../../lib/themes/external.generated';
import {
  CORE_ASSETS_BY_AREA,
  THEME_ASSETS_BY_THEME_ID
} from '../../lib/themes/assets.generated';
import { resolveAreaAssetHrefsBySelection } from '../../lib/themes/assets';
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

test('resolveAreaAssetHrefsBySelection merges core and theme asset bundles', () => {
  const frontendPack = EXTERNAL_THEME_PACKS.find(
    (pack) => pack.areas.includes('frontend') || pack.areas.includes('global')
  );
  assert.ok(frontendPack);

  const themeId = frontendPack.themeId;
  const frontendBundle = THEME_ASSETS_BY_THEME_ID[themeId]?.frontend;
  assert.ok(frontendBundle);

  const resolved = resolveAreaAssetHrefsBySelection({
    themeId,
    area: 'frontend'
  });

  assert.equal(resolved.themeId, themeId);
  assert.deepEqual(resolved.themeCssHrefs, frontendBundle.cssHrefs);
  assert.deepEqual(resolved.themeScriptHrefs, frontendBundle.scriptHrefs);
  assert.equal(resolved.ignoreCoreCss, frontendBundle.ignoreCoreCss);
  assert.equal(resolved.ignoreCoreScript, frontendBundle.ignoreCoreScript);

  if (!frontendBundle.ignoreCoreCss && CORE_ASSETS_BY_AREA.frontend.cssHref) {
    assert.equal(resolved.cssHrefs[0], CORE_ASSETS_BY_AREA.frontend.cssHref);
  }
});
