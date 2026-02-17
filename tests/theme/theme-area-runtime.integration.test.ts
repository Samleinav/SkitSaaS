import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { ExternalThemePack } from '../../lib/themes/external.generated';
import {
  resolveThemeAreaFromPath,
  resolveThemeSelection,
  type ThemeRuntimeSnapshot
} from '../../lib/theme-runtime';
import { getExternalThemeTokensCssBySelection } from '../../lib/themes/runtime';

function writeCss(rootDir: string, relativePath: string, css: string) {
  const absolutePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, css, 'utf8');
}

function makePack({
  themeId,
  areas,
  entryTokensPath
}: {
  themeId: string;
  areas: ExternalThemePack['areas'];
  entryTokensPath: string;
}): ExternalThemePack {
  return {
    themeId,
    version: '1.0.0',
    areas,
    mode: 'tokens',
    entryTokens: path.basename(entryTokensPath),
    themeRange: '^1.0.0',
    packDir: path.dirname(entryTokensPath),
    entryTokensPath,
    entryTemplatesPath: null,
    entryAssetsPath: null,
    themeCompatible: true,
    codeTemplates: [],
    hasThemeConfig: false,
    hasFrontendRoutes: false,
    frontendRoutesImportPath: null
  };
}

test('theme runtime integration resolves and loads tokens for admin/dashboard/frontend', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-area-runtime-'));

  const adminTokensPath = path.join('themes', 'admin', 'tokens.css');
  const dashboardTokensPath = path.join('themes', 'dashboard', 'tokens.css');
  const frontendTokensPath = path.join('themes', 'frontend', 'tokens.css');

  writeCss(tempRoot, adminTokensPath, ':root{--admin-token:1;}');
  writeCss(tempRoot, dashboardTokensPath, ':root{--dashboard-token:1;}');
  writeCss(tempRoot, frontendTokensPath, ':root{--frontend-token:1;}');

  const packs: ExternalThemePack[] = [
    makePack({
      themeId: 'theme.admin.runtime',
      areas: ['admin'],
      entryTokensPath: adminTokensPath
    }),
    makePack({
      themeId: 'theme.dashboard.runtime',
      areas: ['dashboard'],
      entryTokensPath: dashboardTokensPath
    }),
    makePack({
      themeId: 'theme.frontend.runtime',
      areas: ['frontend'],
      entryTokensPath: frontendTokensPath
    })
  ];

  const snapshot: ThemeRuntimeSnapshot = {
    policy: {
      mode: 'system',
      allowUserOverride: true,
      defaults: {
        admin: 'theme.admin.runtime',
        dashboard: 'theme.dashboard.runtime',
        public: 'theme.frontend.runtime'
      }
    },
    activeThemes: {},
    userPreferences: {}
  };

  const adminSelection = resolveThemeSelection(snapshot, 'admin');
  const dashboardSelection = resolveThemeSelection(snapshot, 'dashboard');
  const frontendSelection = resolveThemeSelection(snapshot, 'frontend');

  const adminCss = getExternalThemeTokensCssBySelection({
    themeId: adminSelection.themeKey,
    area: 'admin',
    packs,
    rootDir: tempRoot
  });
  const dashboardCss = getExternalThemeTokensCssBySelection({
    themeId: dashboardSelection.themeKey,
    area: 'dashboard',
    packs,
    rootDir: tempRoot
  });
  const frontendCss = getExternalThemeTokensCssBySelection({
    themeId: frontendSelection.themeKey,
    area: 'frontend',
    packs,
    rootDir: tempRoot
  });

  assert.equal(adminCss, ':root{--admin-token:1;}');
  assert.equal(dashboardCss, ':root{--dashboard-token:1;}');
  assert.equal(frontendCss, ':root{--frontend-token:1;}');
});

test('theme runtime integration maps login routes to the right themed area', () => {
  const snapshot: ThemeRuntimeSnapshot = {
    policy: {
      mode: 'system',
      allowUserOverride: true,
      defaults: {
        admin: 'theme.admin.runtime',
        dashboard: 'theme.dashboard.runtime'
      }
    },
    activeThemes: {},
    userPreferences: {}
  };

  const adminLoginArea = resolveThemeAreaFromPath('/admin/login');
  const dashboardLoginArea = resolveThemeAreaFromPath('/login');

  const adminLoginSelection = resolveThemeSelection(snapshot, adminLoginArea);
  const dashboardLoginSelection = resolveThemeSelection(
    snapshot,
    dashboardLoginArea
  );

  assert.equal(adminLoginSelection.themeKey, 'theme.admin.runtime');
  assert.equal(dashboardLoginSelection.themeKey, 'theme.dashboard.runtime');
});

test('theme runtime integration supports shared admin/dashboard pack and global fallback', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-area-runtime-'));

  const sharedTokensPath = path.join('themes', 'shared', 'tokens.css');
  const globalTokensPath = path.join('themes', 'global', 'tokens.css');

  writeCss(tempRoot, sharedTokensPath, ':root{--shared-token:1;}');
  writeCss(tempRoot, globalTokensPath, ':root{--global-token:1;}');

  const packs: ExternalThemePack[] = [
    makePack({
      themeId: 'theme.shared.ops',
      areas: ['admin', 'dashboard'],
      entryTokensPath: sharedTokensPath
    }),
    makePack({
      themeId: 'theme.global.core',
      areas: ['global'],
      entryTokensPath: globalTokensPath
    })
  ];

  const snapshot: ThemeRuntimeSnapshot = {
    policy: {
      mode: 'system',
      allowUserOverride: true,
      defaults: {
        admin: 'theme.shared.ops',
        dashboard: 'theme.shared.ops',
        global: 'theme.global.core'
      }
    },
    activeThemes: {},
    userPreferences: {}
  };

  const adminSelection = resolveThemeSelection(snapshot, 'admin');
  const dashboardSelection = resolveThemeSelection(snapshot, 'dashboard');
  const frontendSelection = resolveThemeSelection(snapshot, 'frontend');

  const adminCss = getExternalThemeTokensCssBySelection({
    themeId: adminSelection.themeKey,
    area: 'admin',
    packs,
    rootDir: tempRoot
  });
  const dashboardCss = getExternalThemeTokensCssBySelection({
    themeId: dashboardSelection.themeKey,
    area: 'dashboard',
    packs,
    rootDir: tempRoot
  });
  const frontendCss = getExternalThemeTokensCssBySelection({
    themeId: frontendSelection.themeKey,
    area: 'frontend',
    packs,
    rootDir: tempRoot
  });

  assert.equal(adminCss, ':root{--shared-token:1;}');
  assert.equal(dashboardCss, ':root{--shared-token:1;}');
  assert.equal(frontendCss, ':root{--global-token:1;}');
});
