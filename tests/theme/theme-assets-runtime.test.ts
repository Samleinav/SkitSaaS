import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import type { ExternalThemePack } from '../../lib/themes/external.generated';
import { THEME_CODE_REGISTRY } from '../../lib/themes/code-registry.generated';
import {
  getExternalThemeFaviconDataUrlBySelectionFromConfig,
  getExternalThemeNotFoundTemplateIdBySelectionFromConfig,
  readExternalThemeGlobalCssBySelectionFromConfig,
  resolveLoginThemeAreaByPathFromSelectionFromConfig
} from '../../lib/themes/assets';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

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

test('theme assets runtime resolves css/favicon/not-found by area from theme config import', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-assets-runtime-'));
  const packDir = path.join('themes', 'frontend-config-pack');
  const themeId = 'theme.frontend.config.assets';

  writeFile(path.join(tempRoot, packDir, 'tokens.css'), ':root{}');
  writeFile(
    path.join(tempRoot, packDir, 'global.css'),
    '.theme-frontend-config{color:green;}'
  );
  writeFile(
    path.join(tempRoot, packDir, 'assets', 'favicon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  );
  writeFile(
    path.join(tempRoot, packDir, 'config.mjs'),
    [
      'const config = {',
      '  assets: {',
      "    globalCssByArea: { frontend: 'global.css' },",
      "    faviconByArea: { frontend: 'assets/favicon.svg' },",
      "    notFoundTemplateByArea: { frontend: 'system.not-found' }",
      '  }',
      '};',
      '',
      'export default config;',
      ''
    ].join('\n')
  );

  const pack = makePack({
    themeId,
    areas: ['frontend'],
    packDir,
    entryTokensPath: path.join(packDir, 'tokens.css'),
    entryAssetsPath: null,
    hasThemeConfig: true
  });

  THEME_CODE_REGISTRY[themeId] = {
    themeId,
    configImport: async () =>
      import(pathToFileURL(path.join(tempRoot, packDir, 'config.mjs')).href),
    providerImport: null,
    templates: {}
  };

  try {
    const globalCss = await readExternalThemeGlobalCssBySelectionFromConfig({
      themeId,
      area: 'frontend',
      packs: [pack],
      rootDir: tempRoot
    });
    const favicon = await getExternalThemeFaviconDataUrlBySelectionFromConfig({
      themeId,
      area: 'frontend',
      packs: [pack],
      rootDir: tempRoot
    });
    const notFoundTemplateId =
      await getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
        themeId,
        area: 'frontend',
        packs: [pack],
        rootDir: tempRoot
      });

    assert.equal(globalCss, '.theme-frontend-config{color:green;}');
    assert.match(favicon ?? '', /^data:image\/svg\+xml;base64,/);
    assert.equal(notFoundTemplateId, 'system.not-found');
  } finally {
    delete THEME_CODE_REGISTRY[themeId];
  }
});

test('theme assets runtime resolves not-found/login-area from theme config import', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-assets-runtime-'));
  const packDir = path.join('themes', 'backoffice-config-pack');
  const themeId = 'theme.backoffice.config.assets';

  writeFile(path.join(tempRoot, packDir, 'tokens.css'), ':root{}');
  writeFile(
    path.join(tempRoot, packDir, 'config.mjs'),
    [
      'const config = {',
      '  assets: {',
      "    notFoundTemplateByArea: { admin: 'system.not-found' },",
      "    loginThemeAreaByPath: { '/admin/login': 'admin', '/login': 'dashboard' }",
      '  }',
      '};',
      '',
      'export default config;',
      ''
    ].join('\n')
  );

  const pack = makePack({
    themeId,
    areas: ['admin', 'dashboard'],
    packDir,
    entryTokensPath: path.join(packDir, 'tokens.css'),
    entryAssetsPath: null,
    hasThemeConfig: true
  });

  THEME_CODE_REGISTRY[themeId] = {
    themeId,
    configImport: async () =>
      import(pathToFileURL(path.join(tempRoot, packDir, 'config.mjs')).href),
    providerImport: null,
    templates: {}
  };

  try {
    const notFoundTemplateId =
      await getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
        themeId,
        area: 'admin',
        packs: [pack],
        rootDir: tempRoot
      });
    const loginThemeArea =
      await resolveLoginThemeAreaByPathFromSelectionFromConfig({
        themeId,
        area: 'dashboard',
        pathName: '/admin/login',
        packs: [pack],
        rootDir: tempRoot
      });

    assert.equal(notFoundTemplateId, 'system.not-found');
    assert.equal(loginThemeArea, 'admin');
  } finally {
    delete THEME_CODE_REGISTRY[themeId];
  }
});

test('theme assets runtime resolves area fallback from global entries in theme config', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-assets-runtime-'));
  const packDir = path.join('themes', 'shared-config-pack');
  const themeId = 'theme.shared.config.assets';

  writeFile(path.join(tempRoot, packDir, 'tokens.css'), ':root{}');
  writeFile(
    path.join(tempRoot, packDir, 'global.css'),
    '.theme-shared{color:blue;}'
  );
  writeFile(
    path.join(tempRoot, packDir, 'assets', 'favicon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  );
  writeFile(
    path.join(tempRoot, packDir, 'config.mjs'),
    [
      'const config = {',
      '  assets: {',
      "    globalCssByArea: { global: 'global.css' },",
      "    faviconByArea: { global: 'assets/favicon.svg' },",
      "    notFoundTemplateByArea: { global: 'system.not-found' },",
      "    loginThemeAreaByPath: { '/admin/login': 'admin', '/login': 'dashboard' }",
      '  }',
      '};',
      '',
      'export default config;',
      ''
    ].join('\n')
  );

  const pack = makePack({
    themeId,
    areas: ['global'],
    packDir,
    entryTokensPath: path.join(packDir, 'tokens.css'),
    entryAssetsPath: null,
    hasThemeConfig: true
  });

  THEME_CODE_REGISTRY[themeId] = {
    themeId,
    configImport: async () =>
      import(pathToFileURL(path.join(tempRoot, packDir, 'config.mjs')).href),
    providerImport: null,
    templates: {}
  };

  try {
    const dashboardCss = await readExternalThemeGlobalCssBySelectionFromConfig({
      themeId: pack.themeId,
      area: 'dashboard',
      packs: [pack],
      rootDir: tempRoot
    });
    const adminFavicon =
      await getExternalThemeFaviconDataUrlBySelectionFromConfig({
        themeId: pack.themeId,
        area: 'admin',
        packs: [pack],
        rootDir: tempRoot
      });
    const dashboardNotFoundTemplateId =
      await getExternalThemeNotFoundTemplateIdBySelectionFromConfig({
        themeId: pack.themeId,
        area: 'dashboard',
        packs: [pack],
        rootDir: tempRoot
      });
    const loginThemeArea =
      await resolveLoginThemeAreaByPathFromSelectionFromConfig({
        themeId: pack.themeId,
        area: 'dashboard',
        pathName: '/admin/login',
        packs: [pack],
        rootDir: tempRoot
      });

    assert.equal(dashboardCss, '.theme-shared{color:blue;}');
    assert.match(adminFavicon ?? '', /^data:image\/svg\+xml;base64,/);
    assert.equal(dashboardNotFoundTemplateId, 'system.not-found');
    assert.equal(loginThemeArea, 'admin');
  } finally {
    delete THEME_CODE_REGISTRY[themeId];
  }
});

test('theme assets runtime rejects unsafe relative paths outside pack in theme config', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-assets-runtime-'));
  const packDir = path.join('themes', 'unsafe-config-pack');
  const themeId = 'theme.unsafe.config.assets';

  writeFile(path.join(tempRoot, packDir, 'tokens.css'), ':root{}');
  writeFile(path.join(tempRoot, 'outside.css'), '.outside{color:black;}');
  writeFile(
    path.join(tempRoot, packDir, 'config.mjs'),
    [
      'const config = {',
      '  assets: {',
      "    globalCssByArea: { frontend: '../outside.css' }",
      '  }',
      '};',
      '',
      'export default config;',
      ''
    ].join('\n')
  );

  const pack = makePack({
    themeId,
    areas: ['frontend'],
    packDir,
    entryTokensPath: path.join(packDir, 'tokens.css'),
    entryAssetsPath: null,
    hasThemeConfig: true
  });

  THEME_CODE_REGISTRY[themeId] = {
    themeId,
    configImport: async () =>
      import(pathToFileURL(path.join(tempRoot, packDir, 'config.mjs')).href),
    providerImport: null,
    templates: {}
  };

  try {
    const globalCss = await readExternalThemeGlobalCssBySelectionFromConfig({
      themeId,
      area: 'frontend',
      packs: [pack],
      rootDir: tempRoot
    });

    assert.equal(globalCss, null);
  } finally {
    delete THEME_CODE_REGISTRY[themeId];
  }
});
