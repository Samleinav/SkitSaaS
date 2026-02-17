import assert from 'node:assert/strict';
import test from 'node:test';
import { createTemplateController } from '../../lib/templates/controller';

test('template controller resolves precedence in expected order', () => {
  const controller = createTemplateController();
  const componentId = 'ui.table';

  controller.registerCoreTemplates([
    {
      componentId,
      templateId: 'core.table',
      render: () => 'core'
    }
  ]);

  controller.registerThemeTemplates(
    'theme.corporate',
    [
      {
        componentId,
        templateId: 'theme.global.table',
        render: () => 'theme-global'
      }
    ],
    { area: 'global' }
  );
  controller.registerThemeTemplates(
    'theme.corporate',
    [
      {
        componentId,
        templateId: 'theme.dashboard.table',
        render: () => 'theme-dashboard'
      }
    ],
    { area: 'dashboard' }
  );
  controller.registerModuleTemplates('mod.analytics', [
    {
      componentId,
      templateId: 'module.default.table',
      render: () => 'module-default'
    }
  ]);
  controller.registerModuleTemplates(
    'mod.override',
    [
      {
        componentId,
        templateId: 'module.override.table',
        render: () => 'module-override'
      }
    ],
    { kind: 'override' }
  );

  const withModuleOverride = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.corporate',
    moduleId: 'mod.override'
  });
  assert.equal(withModuleOverride.source, 'module_override');
  assert.equal(withModuleOverride.entry?.templateId, 'module.override.table');

  const withThemeArea = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.corporate',
    moduleId: 'mod.analytics'
  });
  assert.equal(withThemeArea.source, 'theme_area_override');
  assert.equal(withThemeArea.entry?.templateId, 'theme.dashboard.table');

  const withThemeGlobal = controller.resolveTemplate(componentId, {
    area: 'frontend',
    themeId: 'theme.corporate',
    moduleId: 'mod.analytics'
  });
  assert.equal(withThemeGlobal.source, 'theme_global_override');
  assert.equal(withThemeGlobal.entry?.templateId, 'theme.global.table');

  const withModuleDefault = controller.resolveTemplate(componentId, {
    area: 'frontend',
    moduleId: 'mod.analytics'
  });
  assert.equal(withModuleDefault.source, 'module_default');
  assert.equal(withModuleDefault.entry?.templateId, 'module.default.table');

  const withCore = controller.resolveTemplate(componentId, {
    area: 'frontend'
  });
  assert.equal(withCore.source, 'core_default');
  assert.equal(withCore.entry?.templateId, 'core.table');
});

test('template controller enforces module lockTemplate unless admin force override', () => {
  const controller = createTemplateController();
  const componentId = 'ui.alert-dialog';

  controller.registerCoreTemplates([
    {
      componentId,
      templateId: 'core.alert',
      render: () => 'core'
    }
  ]);
  controller.registerThemeTemplates(
    'theme.ops',
    [
      {
        componentId,
        templateId: 'theme.alert',
        render: () => 'theme'
      }
    ],
    { area: 'dashboard' }
  );
  controller.registerModuleTemplates('mod.billing', [
    {
      componentId,
      templateId: 'module.alert.locked',
      lockTemplate: true,
      render: () => 'module'
    }
  ]);

  const locked = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.ops',
    moduleId: 'mod.billing'
  });
  assert.equal(locked.source, 'module_default');
  assert.equal(locked.entry?.templateId, 'module.alert.locked');
  assert.equal(locked.trace.lockTemplate, true);

  const adminForced = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.ops',
    moduleId: 'mod.billing',
    flags: {
      adminForceOverride: true
    }
  });
  assert.equal(adminForced.source, 'theme_area_override');
  assert.equal(adminForced.entry?.templateId, 'theme.alert');
});

test('template controller keeps theme override when module has no local template', () => {
  const controller = createTemplateController();
  const componentId = 'ui.table';

  controller.registerCoreTemplates([
    {
      componentId,
      templateId: 'core.table',
      render: () => 'core'
    }
  ]);
  controller.registerThemeTemplates(
    'theme.dashboard.ops',
    [
      {
        componentId,
        templateId: 'theme.dashboard.table',
        render: () => 'theme'
      }
    ],
    { area: 'dashboard' }
  );

  const resolution = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.dashboard.ops',
    moduleId: 'mod.without.template.pack'
  });

  assert.equal(resolution.source, 'theme_area_override');
  assert.equal(resolution.entry?.templateId, 'theme.dashboard.table');
});

test('template controller rejects lockTemplate on non-lockable component', () => {
  const controller = createTemplateController();

  assert.throws(
    () =>
      controller.registerModuleTemplates('mod.invalid', [
        {
          componentId: 'ui.table',
          lockTemplate: true,
          render: () => 'invalid'
        }
      ]),
    /not lockable/
  );
});

test('template controller renderWithTemplate falls back when template throws', () => {
  const controller = createTemplateController();
  const componentId = 'ui.table';

  controller.registerCoreTemplates([
    {
      componentId,
      templateId: 'core.throwing',
      render: () => {
        throw new Error('boom');
      }
    }
  ]);

  const rendered = controller.renderWithTemplate(
    componentId,
    {
      area: 'dashboard'
    },
    () => 'fallback-render'
  );

  assert.equal(rendered, 'fallback-render');
});

test('template controller supports module-first priority when configured in context', () => {
  const controller = createTemplateController();
  const componentId = 'ui.table';

  controller.registerCoreTemplates([
    {
      componentId,
      templateId: 'core.table',
      render: () => 'core'
    }
  ]);
  controller.registerThemeTemplates(
    'theme.ops',
    [
      {
        componentId,
        templateId: 'theme.dashboard.table',
        render: () => 'theme'
      }
    ],
    { area: 'dashboard' }
  );
  controller.registerModuleTemplates('mod.reporting', [
    {
      componentId,
      templateId: 'mod.reporting.default.table',
      render: () => 'module'
    }
  ]);

  const themeFirst = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.ops',
    moduleId: 'mod.reporting',
    flags: {
      templatePriority: 'theme'
    }
  });
  assert.equal(themeFirst.source, 'theme_area_override');
  assert.equal(themeFirst.entry?.templateId, 'theme.dashboard.table');

  const moduleFirst = controller.resolveTemplate(componentId, {
    area: 'dashboard',
    themeId: 'theme.ops',
    moduleId: 'mod.reporting',
    flags: {
      templatePriority: 'module'
    }
  });
  assert.equal(moduleFirst.source, 'module_default');
  assert.equal(moduleFirst.entry?.templateId, 'mod.reporting.default.table');
});

test('template controller captures resolution traces and trace callback', () => {
  const seenSources: string[] = [];
  const controller = createTemplateController({
    traceLimit: 2,
    onTrace(trace) {
      seenSources.push(trace.source);
    }
  });

  controller.registerCoreTemplates([
    {
      componentId: 'ui.table',
      templateId: 'core.table',
      render: () => 'core'
    }
  ]);

  controller.resolveTemplate('ui.table', { area: 'dashboard' });
  controller.resolveTemplate('ui.unknown', { area: 'dashboard' });
  controller.resolveTemplate('ui.table', { area: 'frontend' });

  const traces = controller.getResolutionTraces();
  assert.equal(traces.length, 2);
  assert.equal(traces[0]?.source, 'fallback');
  assert.equal(traces[1]?.source, 'core_default');
  assert.equal(seenSources.length, 3);

  controller.clearResolutionTraces();
  assert.equal(controller.getResolutionTraces().length, 0);
});
