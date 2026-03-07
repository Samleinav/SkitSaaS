import { cache } from 'react';
import { getModuleManifest } from '@/lib/modules/registry';
import {
  createTemplateController,
  type TemplateArea,
  type TemplateController,
  type TemplateResolverContext
} from '@/lib/templates/controller';
import { registerModuleTemplatesFromManifest } from '@/lib/templates/module-pack';
import { registerThemeTemplatesFromSelection } from '@/lib/templates/theme-pack';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { THEME_TEMPLATE_PRIORITY } from '@/lib/themes/selection.generated';

type TemplateRuntimeSnapshot = {
  area: TemplateArea;
  themeId: string | null;
  controller: TemplateController;
  registeredThemeTemplates: number;
};

const registeredModuleTemplatePacksByArea = new Map<TemplateArea, Set<string>>();

function tryRegisterModuleTemplatePack({
  controller,
  area,
  moduleId
}: {
  controller: TemplateController;
  area: TemplateArea;
  moduleId: string | null | undefined;
}) {
  const normalizedModuleId = String(moduleId ?? '').trim();
  if (!normalizedModuleId) {
    return;
  }

  const registeredForArea =
    registeredModuleTemplatePacksByArea.get(area) ?? new Set<string>();
  registeredModuleTemplatePacksByArea.set(area, registeredForArea);

  if (registeredForArea.has(normalizedModuleId)) {
    return;
  }

  const manifest = getModuleManifest(normalizedModuleId);
  if (!manifest?.templatePack) {
    registeredForArea.add(normalizedModuleId);
    return;
  }

  registerModuleTemplatesFromManifest({
    controller,
    manifest
  });
  registeredForArea.add(normalizedModuleId);
}

export const getTemplateRuntimeSnapshotForArea = cache(
  async (area: TemplateArea): Promise<TemplateRuntimeSnapshot> => {
    const controller = createTemplateController();
    const themeSelection = await getThemeSelectionForArea(area);
    const registration = registerThemeTemplatesFromSelection({
      controller,
      themeId: themeSelection.themeKey,
      area
    });

    return {
      area,
      themeId: registration.themeId,
      controller,
      registeredThemeTemplates: registration.registered
    };
  }
);

export async function resolveTemplateForArea({
  componentId,
  context
}: {
  componentId: string;
  context: TemplateResolverContext;
}) {
  const snapshot = await getTemplateRuntimeSnapshotForArea(context.area);
  const templatePriority =
    context.area === 'admin' || context.area === 'dashboard'
      ? THEME_TEMPLATE_PRIORITY
      : 'theme';
  const contextWithPriority: TemplateResolverContext = {
    ...context,
    flags: {
      ...(context.flags ?? {}),
      templatePriority
    }
  };

  tryRegisterModuleTemplatePack({
    controller: snapshot.controller,
    area: snapshot.area,
    moduleId: contextWithPriority.moduleId
  });
  return snapshot.controller.resolveTemplate(componentId, contextWithPriority);
}
