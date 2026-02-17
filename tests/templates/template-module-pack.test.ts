import assert from 'node:assert/strict';
import test from 'node:test';
import { defineModule } from '../../lib/modules/manifest';
import { createTemplateController } from '../../lib/templates/controller';
import { registerModuleTemplatesFromManifest } from '../../lib/templates/module-pack';

test('module template pack registers defaults and overrides', () => {
  const controller = createTemplateController({
    coreTemplates: [
      {
        componentId: 'ui.table',
        templateId: 'core.table',
        render: () => 'core-table'
      }
    ]
  });

  const moduleManifest = defineModule({
    moduleId: 'mod.templates',
    version: '1.0.0',
    displayName: 'Module Templates',
    templatePack: {
      defaults: [
        {
          componentId: 'ui.table',
          templateId: 'mod.templates.default.table'
        }
      ],
      overrides: [
        {
          componentId: 'ui.async-submit-button',
          templateId: 'mod.templates.override.async-submit'
        }
      ]
    }
  });

  const registration = registerModuleTemplatesFromManifest({
    controller,
    manifest: moduleManifest
  });

  assert.equal(registration.registered, 2);

  const defaultResolution = controller.resolveTemplate('ui.table', {
    area: 'dashboard',
    moduleId: 'mod.templates'
  });
  assert.equal(defaultResolution.source, 'module_default');
  assert.equal(
    defaultResolution.entry?.templateId,
    'mod.templates.default.table'
  );

  const overrideResolution = controller.resolveTemplate('ui.async-submit-button', {
    area: 'dashboard',
    moduleId: 'mod.templates'
  });
  assert.equal(overrideResolution.source, 'module_override');
  assert.equal(
    overrideResolution.entry?.templateId,
    'mod.templates.override.async-submit'
  );
});

test('module template pack override has priority over theme overrides', () => {
  const controller = createTemplateController();

  controller.registerThemeTemplates(
    'theme.ops.dashboard',
    [
      {
        componentId: 'ui.table',
        templateId: 'theme.dashboard.table',
        render: () => 'theme-table'
      }
    ],
    {
      area: 'dashboard'
    }
  );

  const moduleManifest = defineModule({
    moduleId: 'mod.templates',
    version: '1.0.0',
    displayName: 'Module Templates',
    templatePack: {
      overrides: [
        {
          componentId: 'ui.table',
          templateId: 'mod.templates.override.table'
        }
      ]
    }
  });

  registerModuleTemplatesFromManifest({
    controller,
    manifest: moduleManifest
  });

  const resolution = controller.resolveTemplate('ui.table', {
    area: 'dashboard',
    themeId: 'theme.ops.dashboard',
    moduleId: 'mod.templates'
  });
  assert.equal(resolution.source, 'module_override');
  assert.equal(
    resolution.entry?.templateId,
    'mod.templates.override.table'
  );
});

test('module template pack validates duplicated entries per kind', () => {
  const controller = createTemplateController();
  const moduleManifest = defineModule({
    moduleId: 'mod.templates.dup',
    version: '1.0.0',
    displayName: 'Module Templates Dup',
    templatePack: {
      defaults: [
        { componentId: 'ui.table' },
        { componentId: 'ui.table' }
      ]
    }
  });

  assert.throws(
    () =>
      registerModuleTemplatesFromManifest({
        controller,
        manifest: moduleManifest
      }),
    /duplicates componentId/
  );
});
