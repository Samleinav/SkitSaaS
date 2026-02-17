import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createTemplateController } from '../../lib/templates/controller';
import { registerThemeTemplatesFromSelection } from '../../lib/templates/theme-pack';
import type { ExternalThemePack } from '../../lib/themes/external.generated';

function writeJson(filePath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
}

function makePack({
  themeId,
  areas,
  entryTemplatesPath
}: {
  themeId: string;
  areas: ExternalThemePack['areas'];
  entryTemplatesPath: string | null;
}): ExternalThemePack {
  return {
    themeId,
    version: '1.0.0',
    areas,
    mode: 'tokens',
    entryTokens: 'tokens.css',
    themeRange: '^1.0.0',
    packDir: 'themes/test',
    entryTokensPath: 'themes/test/tokens.css',
    entryTemplatesPath,
    entryAssetsPath: null,
    themeCompatible: true,
    codeTemplates: [],
    hasThemeConfig: false,
    hasFrontendRoutes: false,
    frontendRoutesImportPath: null
  };
}

test('theme template pack registers area + global templates and resolves correctly', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'ops', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    contractRange: '^1.0.0',
    templates: {
      global: [
        {
          componentId: 'ui.async-submit-button',
          templateId: 'theme.global.async-submit'
        }
      ],
      dashboard: [
        {
          componentId: 'ui.table',
          templateId: 'theme.dashboard.table'
        }
      ]
    }
  });

  const controller = createTemplateController({
    coreTemplates: [
      {
        componentId: 'ui.table',
        templateId: 'core.table',
        render: () => 'core-table'
      },
      {
        componentId: 'ui.async-submit-button',
        templateId: 'core.async-submit',
        render: () => 'core-async'
      }
    ]
  });

  const registration = registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.ops.dashboard',
    area: 'dashboard',
    packs: [
      makePack({
        themeId: 'theme.ops.dashboard',
        areas: ['dashboard', 'global'],
        entryTemplatesPath: manifestPath
      })
    ],
    rootDir: tempRoot
  });

  assert.equal(registration.themeId, 'theme.ops.dashboard');
  assert.equal(registration.registered, 2);

  const areaResolution = controller.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.ops.dashboard'
  });
  assert.equal(areaResolution.source, 'theme_area_override');
  assert.equal(areaResolution.entry?.templateId, 'theme.dashboard.table');

  const globalResolution = controller.resolveTemplate('ui.async-submit-button', {
    area: 'dashboard',
    themeId: 'theme.ops.dashboard'
  });
  assert.equal(globalResolution.source, 'theme_global_override');
  assert.equal(
    globalResolution.entry?.templateId,
    'theme.global.async-submit'
  );
});

test('theme template pack resolves ui.table with different templates per area', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'area-split', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    templates: {
      admin: [{ componentId: 'ui.table', templateId: 'theme.admin.table' }],
      dashboard: [
        { componentId: 'ui.table', templateId: 'theme.dashboard.table' }
      ],
      frontend: [{ componentId: 'ui.table', templateId: 'theme.frontend.table' }]
    }
  });

  const controller = createTemplateController({
    coreTemplates: [
      {
        componentId: 'ui.table',
        templateId: 'core.table',
        render: () => 'core-table'
      }
    ]
  });

  const pack = makePack({
    themeId: 'theme.area.split',
    areas: ['admin', 'dashboard', 'frontend'],
    entryTemplatesPath: manifestPath
  });

  registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.area.split',
    area: 'admin',
    packs: [pack],
    rootDir: tempRoot
  });
  registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.area.split',
    area: 'dashboard',
    packs: [pack],
    rootDir: tempRoot
  });
  registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.area.split',
    area: 'frontend',
    packs: [pack],
    rootDir: tempRoot
  });

  const adminResolution = controller.resolveTemplate('ui.table', {
    area: 'admin',
    themeId: 'theme.area.split'
  });
  const dashboardResolution = controller.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.area.split'
  });
  const frontendResolution = controller.resolveTemplate('ui.table', {
    area: 'frontend',
    themeId: 'theme.area.split'
  });

  assert.equal(adminResolution.entry?.templateId, 'theme.admin.table');
  assert.equal(dashboardResolution.entry?.templateId, 'theme.dashboard.table');
  assert.equal(frontendResolution.entry?.templateId, 'theme.frontend.table');
});

test('theme template pack rejects duplicated component ids per area', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'dup', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    templates: {
      dashboard: [
        { componentId: 'ui.table' },
        { componentId: 'ui.table' }
      ]
    }
  });

  const controller = createTemplateController();
  assert.throws(
    () =>
      registerThemeTemplatesFromSelection({
        controller,
        themeId: 'theme.dup.dashboard',
        area: 'dashboard',
        packs: [
          makePack({
            themeId: 'theme.dup.dashboard',
            areas: ['dashboard'],
            entryTemplatesPath: manifestPath
          })
        ],
        rootDir: tempRoot
      }),
    /duplicates componentId/
  );
});

test('theme template pack allows ui.alert-dialog overrides', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'alert', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    templates: {
      dashboard: [
        {
          componentId: 'ui.alert-dialog',
          templateId: 'theme.alert.dialog'
        }
      ]
    }
  });

  const controller = createTemplateController({
    coreTemplates: [
      {
        componentId: 'ui.alert-dialog',
        templateId: 'core.alert.dialog',
        render: () => 'core-alert'
      }
    ]
  });

  const registration = registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.alert.dashboard',
    area: 'dashboard',
    packs: [
      makePack({
        themeId: 'theme.alert.dashboard',
        areas: ['dashboard'],
        entryTemplatesPath: manifestPath
      })
    ],
    rootDir: tempRoot
  });

  assert.equal(registration.registered, 1);
  const resolution = controller.resolveTemplate('ui.alert-dialog', {
    area: 'dashboard',
    themeId: 'theme.alert.dashboard'
  });
  assert.equal(resolution.source, 'theme_area_override');
  assert.equal(resolution.entry?.templateId, 'theme.alert.dialog');
});

test('theme template pack returns no-op when selection has no template entry file', () => {
  const controller = createTemplateController();

  const registration = registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.tokens.only',
    area: 'dashboard',
    packs: [
      makePack({
        themeId: 'theme.tokens.only',
        areas: ['dashboard'],
        entryTemplatesPath: null
      })
    ]
  });

  assert.equal(registration.registered, 0);
});
