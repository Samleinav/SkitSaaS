import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { defineModule } from '../../lib/modules/manifest';
import { createTemplateController } from '../../lib/templates/controller';
import { registerModuleTemplatesFromManifest } from '../../lib/templates/module-pack';
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

test('host + theme + module integration resolves precedence end-to-end', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'integration', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    contractRange: '^1.0.0',
    templates: {
      global: [
        {
          componentId: 'ui.table',
          templateId: 'theme.global.table'
        }
      ],
      dashboard: [
        {
          componentId: 'ui.table',
          templateId: 'theme.dashboard.table'
        },
        {
          componentId: 'ui.async-submit-button',
          templateId: 'theme.dashboard.async-submit'
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

  registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.integration',
    area: 'dashboard',
    packs: [
      makePack({
        themeId: 'theme.integration',
        areas: ['dashboard', 'global'],
        entryTemplatesPath: manifestPath
      })
    ],
    rootDir: tempRoot
  });

  const moduleManifest = defineModule({
    moduleId: 'mod.integration',
    version: '1.0.0',
    displayName: 'Integration module',
    templatePack: {
      defaults: [
        {
          componentId: 'ui.table',
          templateId: 'mod.integration.default.table'
        }
      ],
      overrides: [
        {
          componentId: 'ui.async-submit-button',
          templateId: 'mod.integration.override.async-submit'
        }
      ]
    }
  });

  registerModuleTemplatesFromManifest({
    controller,
    manifest: moduleManifest
  });

  const dashboardTable = controller.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.integration',
    moduleId: 'mod.integration'
  });
  assert.equal(dashboardTable.source, 'theme_area_override');
  assert.equal(dashboardTable.entry?.templateId, 'theme.dashboard.table');

  const frontendTable = controller.resolveTemplate('ui.table', {
    area: 'frontend',
    themeId: 'theme.integration',
    moduleId: 'mod.integration'
  });
  assert.equal(frontendTable.source, 'theme_global_override');
  assert.equal(frontendTable.entry?.templateId, 'theme.global.table');

  const dashboardAsync = controller.resolveTemplate('ui.async-submit-button', {
    area: 'dashboard',
    themeId: 'theme.integration',
    moduleId: 'mod.integration'
  });
  assert.equal(dashboardAsync.source, 'module_override');
  assert.equal(
    dashboardAsync.entry?.templateId,
    'mod.integration.override.async-submit'
  );
});

test('host + theme + module integration respects lockTemplate with admin force override', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'lock', 'templates.json');
  writeJson(path.join(tempRoot, manifestPath), {
    templates: {
      dashboard: [
        {
          componentId: 'ui.async-submit-button',
          templateId: 'theme.dashboard.async-submit'
        }
      ]
    }
  });

  const controller = createTemplateController({
    coreTemplates: [
      {
        componentId: 'ui.async-submit-button',
        templateId: 'core.async-submit',
        render: () => 'core-async'
      }
    ]
  });

  registerThemeTemplatesFromSelection({
    controller,
    themeId: 'theme.lock',
    area: 'dashboard',
    packs: [
      makePack({
        themeId: 'theme.lock',
        areas: ['dashboard'],
        entryTemplatesPath: manifestPath
      })
    ],
    rootDir: tempRoot
  });

  const moduleManifest = defineModule({
    moduleId: 'mod.lock',
    version: '1.0.0',
    displayName: 'Lock module',
    templatePack: {
      defaults: [
        {
          componentId: 'ui.async-submit-button',
          templateId: 'mod.lock.default.async-submit',
          lockTemplate: true
        }
      ]
    }
  });

  registerModuleTemplatesFromManifest({
    controller,
    manifest: moduleManifest
  });

  const locked = controller.resolveTemplate('ui.async-submit-button', {
    area: 'dashboard',
    themeId: 'theme.lock',
    moduleId: 'mod.lock'
  });
  assert.equal(locked.source, 'module_default');
  assert.equal(locked.entry?.templateId, 'mod.lock.default.async-submit');

  const forced = controller.resolveTemplate('ui.async-submit-button', {
    area: 'dashboard',
    themeId: 'theme.lock',
    moduleId: 'mod.lock',
    flags: {
      adminForceOverride: true
    }
  });
  assert.equal(forced.source, 'theme_area_override');
  assert.equal(forced.entry?.templateId, 'theme.dashboard.async-submit');
});

test('theme template pack manifest cache reuses parsed file by absolute path', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-pack-'));
  const manifestPath = path.join('themes', 'cache', 'templates.json');
  const absoluteManifestPath = path.join(tempRoot, manifestPath);

  writeJson(absoluteManifestPath, {
    templates: {
      dashboard: [
        {
          componentId: 'ui.table',
          templateId: 'theme.cache.v1.table'
        }
      ]
    }
  });

  const pack = makePack({
    themeId: 'theme.cache',
    areas: ['dashboard'],
    entryTemplatesPath: manifestPath
  });

  const controllerV1 = createTemplateController();
  registerThemeTemplatesFromSelection({
    controller: controllerV1,
    themeId: 'theme.cache',
    area: 'dashboard',
    packs: [pack],
    rootDir: tempRoot
  });

  const resolutionV1 = controllerV1.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.cache'
  });
  assert.equal(resolutionV1.entry?.templateId, 'theme.cache.v1.table');

  writeJson(absoluteManifestPath, {
    templates: {
      dashboard: [
        {
          componentId: 'ui.table',
          templateId: 'theme.cache.v2.table'
        }
      ]
    }
  });

  const controllerV2 = createTemplateController();
  registerThemeTemplatesFromSelection({
    controller: controllerV2,
    themeId: 'theme.cache',
    area: 'dashboard',
    packs: [pack],
    rootDir: tempRoot
  });

  const resolutionV2 = controllerV2.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.cache'
  });
  assert.equal(resolutionV2.entry?.templateId, 'theme.cache.v1.table');
});
