import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  BACKOFFICE_BASELINE_THEME_ID,
  BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA
} from '../../lib/themes/required-code-templates';
import { runThemesPrepare } from '../../scripts/themes-prepare';

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function writeThemePack({
  themesDir,
  folder,
  themeId,
  areas,
  themeRange = '^1.0.0',
  includeRequiredBackofficeTemplates = true,
  includeRequiredFrontendRoutes = true,
  codeTemplateIds = []
}: {
  themesDir: string;
  folder: string;
  themeId: string;
  areas: string[];
  themeRange?: string;
  includeRequiredBackofficeTemplates?: boolean;
  includeRequiredFrontendRoutes?: boolean;
  codeTemplateIds?: string[];
}) {
  const themeDir = path.join(themesDir, folder);

  writeFile(
    path.join(themeDir, 'theme.json'),
    JSON.stringify({
      themeId,
      version: '1.0.0',
      areas,
      mode: 'tokens',
      entryTokens: 'tokens.css',
      themeRange
    })
  );
  writeFile(path.join(themeDir, 'tokens.css'), ':root{}');

  const resolvedCodeTemplateIds = new Set<string>(codeTemplateIds);
  if (includeRequiredBackofficeTemplates) {
    if (areas.includes('admin')) {
      for (const templateId of BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA.admin) {
        resolvedCodeTemplateIds.add(templateId);
      }
    }

    if (areas.includes('dashboard')) {
      for (const templateId of BACKOFFICE_REQUIRED_CODE_TEMPLATE_IDS_BY_AREA.dashboard) {
        resolvedCodeTemplateIds.add(templateId);
      }
    }
  }

  for (const templateId of resolvedCodeTemplateIds) {
    writeFile(
      path.join(themeDir, 'templates', `${templateId}.tsx`),
      'export default function ThemeTemplate() { return null; }\n'
    );
  }

  if (areas.includes('frontend') && includeRequiredFrontendRoutes) {
    writeFile(
      path.join(themeDir, 'frontend', 'layout.tsx'),
      'export default function FrontendLayoutRoute({ children }: { children?: any }) { return children ?? null; }\n'
    );
    writeFile(
      path.join(themeDir, 'frontend', 'home.tsx'),
      'export default function FrontendHomeRoute() { return null; }\n'
    );
    writeFile(
      path.join(themeDir, 'frontend', 'pricing.tsx'),
      'export default function FrontendPricingRoute() { return null; }\n'
    );
    writeFile(
      path.join(themeDir, 'frontend', 'not-found.tsx'),
      'export default function FrontendNotFoundRoute() { return null; }\n'
    );
    writeFile(
      path.join(themeDir, 'routes.ts'),
      [
        'const routes = [',
        "  { path: '/__layout', loader: () => import('./frontend/layout') },",
        "  { path: '/', loader: () => import('./frontend/home') },",
        "  { path: '/pricing', loader: () => import('./frontend/pricing') },",
        "  { path: '/404', loader: () => import('./frontend/not-found') }",
        '];',
        '',
        'export default routes;',
        ''
      ].join('\n')
    );
  }
}

const THEME_ENV_KEYS = [
  'THEME_ADMIN',
  'THEME_DASHBOARD',
  'THEME_FRONTEND',
  'THEME_TEMPLATE_PRIORITY',
  'THEME_ADMIN_DEFAULT',
  'THEME_DASHBOARD_DEFAULT',
  'FF_USE_THEME_RUNTIME'
] as const;

const ORIGINAL_THEME_ENV = Object.fromEntries(
  THEME_ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<string, string | undefined>;

function clearThemeEnv() {
  for (const envKey of THEME_ENV_KEYS) {
    delete process.env[envKey];
  }
}

function withThemeEnv(
  values: Partial<Record<(typeof THEME_ENV_KEYS)[number], string>>,
  run: () => void
) {
  const previous = Object.fromEntries(
    THEME_ENV_KEYS.map((key) => [key, process.env[key]])
  ) as Record<string, string | undefined>;

  clearThemeEnv();
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    run();
  } finally {
    clearThemeEnv();
    for (const [key, value] of Object.entries(previous)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
  }
}

test.beforeEach(() => {
  clearThemeEnv();
});

test.after(() => {
  clearThemeEnv();
  for (const [envKey, value] of Object.entries(ORIGINAL_THEME_ENV)) {
    if (value !== undefined) {
      process.env[envKey] = value;
    }
  }
});

test('themes:prepare generates deterministic registry sorted by themeId', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'zeta',
    themeId: 'theme.zeta.dashboard',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'alpha',
    themeId: 'theme.alpha.admin',
    areas: ['admin']
  });
  writeThemePack({
    themesDir,
    folder: 'front',
    themeId: 'theme.front.frontend',
    areas: ['frontend']
  });
  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard']
  });

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.alpha.admin',
      THEME_DASHBOARD: 'theme.zeta.dashboard',
      THEME_FRONTEND: 'theme.front.frontend'
    },
    () => {
      const result = runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        hostThemeVersion: '1.0.0',
        strictCompatibility: true,
        logWarnings: false
      });

      assert.equal(result.resolvedThemePacks.length, 4);
      assert.equal(result.resolvedThemePacks[0]?.themeId, 'theme.alpha.admin');
      assert.equal(
        result.resolvedThemePacks[1]?.themeId,
        BACKOFFICE_BASELINE_THEME_ID
      );
      assert.equal(result.resolvedThemePacks[2]?.themeId, 'theme.front.frontend');
      assert.equal(result.resolvedThemePacks[3]?.themeId, 'theme.zeta.dashboard');
      assert.equal(result.selectedThemesByArea.admin, 'theme.alpha.admin');
      assert.equal(result.selectedThemesByArea.dashboard, 'theme.zeta.dashboard');
      assert.equal(result.selectedThemesByArea.frontend, 'theme.front.frontend');
      assert.equal(result.templatePriority, 'theme');

      const output = fs.readFileSync(result.outputPath, 'utf8');
      assert.match(output, /EXTERNAL_THEME_PACKS/);
      const alphaIndex = output.indexOf('"theme.alpha.admin"');
      const zetaIndex = output.indexOf('"theme.zeta.dashboard"');
      assert.ok(alphaIndex >= 0 && zetaIndex >= 0 && alphaIndex < zetaIndex);

      const selectionOutput = fs.readFileSync(result.selectionOutputPath, 'utf8');
      assert.match(selectionOutput, /THEME_SELECTION_BY_AREA/);
      assert.match(selectionOutput, /THEME_TEMPLATE_PRIORITY/);
    }
  );
});

test('themes:prepare rejects invalid manifests', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeFile(
    path.join(themesDir, 'invalid', 'theme.json'),
    JSON.stringify({
      themeId: 'theme.invalid',
      version: '1.0.0',
      areas: ['public'],
      mode: 'tokens',
      entryTokens: 'tokens.css'
    })
  );
  writeFile(path.join(themesDir, 'invalid', 'tokens.css'), ':root{}');

  assert.throws(
    () =>
      runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        strictCompatibility: true,
        logWarnings: false
      }),
    /theme manifest validation failed/
  );
});

test('themes:prepare rejects duplicated themeId values', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'a',
    themeId: 'theme.shared.id',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'b',
    themeId: 'theme.shared.id',
    areas: ['admin']
  });

  assert.throws(
    () =>
      runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        strictCompatibility: true,
        logWarnings: false
      }),
    /duplicate themeId/
  );
});

test('themes:prepare strict mode rejects incompatible themeRange', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'future',
    themeId: 'theme.future.dashboard',
    areas: ['dashboard'],
    themeRange: '^2.0.0'
  });

  assert.throws(
    () =>
      runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        hostThemeVersion: '1.0.0',
        strictCompatibility: true,
        logWarnings: false
      }),
    /strict theme compatibility failed/
  );
});

test('themes:prepare warning mode keeps incompatible unselected pack and reports warning', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'future',
    themeId: 'theme.future.dashboard',
    areas: ['dashboard'],
    themeRange: '^2.0.0'
  });
  writeThemePack({
    themesDir,
    folder: 'admin',
    themeId: 'theme.admin.ok',
    areas: ['admin']
  });
  writeThemePack({
    themesDir,
    folder: 'dashboard',
    themeId: 'theme.dashboard.ok',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'frontend',
    themeId: 'theme.frontend.ok',
    areas: ['frontend']
  });
  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard']
  });

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.admin.ok',
      THEME_DASHBOARD: 'theme.dashboard.ok',
      THEME_FRONTEND: 'theme.frontend.ok'
    },
    () => {
      const result = runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        hostThemeVersion: '1.0.0',
        strictCompatibility: false,
        logWarnings: false
      });

      assert.equal(result.resolvedThemePacks.length, 5);
      const incompatiblePack = result.resolvedThemePacks.find(
        (pack) => pack.themeId === 'theme.future.dashboard'
      );
      assert.equal(incompatiblePack?.themeCompatible, false);
      assert.match(
        result.warnings.join('\n'),
        /incompatible with host theme contract/
      );
    }
  );
});

test('themes:prepare builds theme i18n registry by locale and area', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'pilot-admin',
    themeId: 'theme.pilot.admin',
    areas: ['admin']
  });
  writeThemePack({
    themesDir,
    folder: 'pilot-dashboard',
    themeId: 'theme.pilot.dashboard',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'pilot-frontend',
    themeId: 'theme.pilot.frontend',
    areas: ['frontend']
  });
  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard']
  });

  writeFile(
    path.join(themesDir, 'pilot-admin', 'i18n', 'admin', 'en.json'),
    JSON.stringify({
      pilotTable: {
        title: 'Pilot Admin Table'
      }
    })
  );
  writeFile(
    path.join(themesDir, 'pilot-admin', 'i18n', 'en.json'),
    JSON.stringify({
      shared: {
        confirm: 'Confirm'
      }
    })
  );

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.pilot.admin',
      THEME_DASHBOARD: 'theme.pilot.dashboard',
      THEME_FRONTEND: 'theme.pilot.frontend'
    },
    () => {
      runThemesPrepare({
        rootDir: tempRoot,
        themesDir,
        hostThemeVersion: '1.0.0',
        strictCompatibility: true,
        logWarnings: false
      });
    }
  );

  const i18nOutputPath = path.join(
    tempRoot,
    'lib',
    'i18n',
    'themes-i18n.generated.ts'
  );
  const output = fs.readFileSync(i18nOutputPath, 'utf8');

  const marker = 'export const THEME_I18N_REGISTRY: ThemeI18nRegistry = ';
  const markerIndex = output.indexOf(marker);
  assert.ok(markerIndex >= 0);

  const rawRegistry = output.slice(markerIndex + marker.length).trim();
  const registry = JSON.parse(rawRegistry.replace(/;\s*$/, '')) as Record<
    string,
    Record<string, unknown>
  >;
  const englishTree = registry['theme.pilot.admin']?.en as
    | Record<string, unknown>
    | undefined;
  const adminMessages = englishTree?.admin as
    | Record<string, unknown>
    | undefined;
  const pilotTable = adminMessages?.pilotTable as
    | Record<string, unknown>
    | undefined;
  const sharedMessages = englishTree?.shared as
    | Record<string, unknown>
    | undefined;

  assert.equal(pilotTable?.title, 'Pilot Admin Table');
  assert.equal(sharedMessages?.confirm, 'Confirm');
});

test('themes:prepare fails when selected theme is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'admin',
    themeId: 'theme.only.admin',
    areas: ['admin']
  });
  writeThemePack({
    themesDir,
    folder: 'dashboard',
    themeId: 'theme.only.dashboard',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'frontend',
    themeId: 'theme.only.frontend',
    areas: ['frontend']
  });

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.missing.admin',
      THEME_DASHBOARD: 'theme.only.dashboard',
      THEME_FRONTEND: 'theme.only.frontend'
    },
    () => {
      assert.throws(
        () =>
          runThemesPrepare({
            rootDir: tempRoot,
            themesDir,
            hostThemeVersion: '1.0.0',
            strictCompatibility: true,
            logWarnings: false
          }),
        /theme selection validation failed/
      );
    }
  );
});

test('themes:prepare fails when selected backoffice theme misses required host templates', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'admin-missing',
    themeId: 'theme.admin.missing',
    areas: ['admin'],
    includeRequiredBackofficeTemplates: false
  });
  writeThemePack({
    themesDir,
    folder: 'dashboard-ok',
    themeId: 'theme.dashboard.ok',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'frontend-ok',
    themeId: 'theme.frontend.ok',
    areas: ['frontend']
  });

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.admin.missing',
      THEME_DASHBOARD: 'theme.dashboard.ok',
      THEME_FRONTEND: 'theme.frontend.ok'
    },
    () => {
      assert.throws(
        () =>
          runThemesPrepare({
            rootDir: tempRoot,
            themesDir,
            hostThemeVersion: '1.0.0',
            strictCompatibility: true,
            logWarnings: false
          }),
        (error) => {
          const message = String((error as Error).message ?? '');
          assert.match(message, /area "admin"/);
          assert.match(message, /missing required host code templates/);
          assert.match(message, /theme -> module/);
          return true;
        }
      );
    }
  );
});

test('themes:prepare fails when selected frontend theme misses routes.ts', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'frontend-missing-routes',
    themeId: 'theme.frontend.missing.routes',
    areas: ['frontend'],
    includeRequiredFrontendRoutes: false
  });

  withThemeEnv(
    {
      THEME_ADMIN: BACKOFFICE_BASELINE_THEME_ID,
      THEME_DASHBOARD: BACKOFFICE_BASELINE_THEME_ID,
      THEME_FRONTEND: 'theme.frontend.missing.routes'
    },
    () => {
      assert.throws(
        () =>
          runThemesPrepare({
            rootDir: tempRoot,
            themesDir,
            hostThemeVersion: '1.0.0',
            strictCompatibility: true,
            logWarnings: false
          }),
        /routes\.ts\[x\] is missing/
      );
    }
  );
});

test('themes:prepare fails when baseline backoffice theme misses required templates', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'themes-prepare-'));
  const themesDir = path.join(tempRoot, 'themes');

  writeThemePack({
    themesDir,
    folder: 'baseline',
    themeId: BACKOFFICE_BASELINE_THEME_ID,
    areas: ['admin', 'dashboard'],
    includeRequiredBackofficeTemplates: false,
    codeTemplateIds: ['ui.table']
  });
  writeThemePack({
    themesDir,
    folder: 'admin-ok',
    themeId: 'theme.admin.ok',
    areas: ['admin']
  });
  writeThemePack({
    themesDir,
    folder: 'dashboard-ok',
    themeId: 'theme.dashboard.ok',
    areas: ['dashboard']
  });
  writeThemePack({
    themesDir,
    folder: 'frontend-ok',
    themeId: 'theme.frontend.ok',
    areas: ['frontend']
  });

  withThemeEnv(
    {
      THEME_ADMIN: 'theme.admin.ok',
      THEME_DASHBOARD: 'theme.dashboard.ok',
      THEME_FRONTEND: 'theme.frontend.ok'
    },
    () => {
      assert.throws(
        () =>
          runThemesPrepare({
            rootDir: tempRoot,
            themesDir,
            hostThemeVersion: '1.0.0',
            strictCompatibility: true,
            logWarnings: false
          }),
        /Baseline backoffice theme/
      );
    }
  );
});
