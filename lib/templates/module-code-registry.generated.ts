import type { ComponentType } from 'react';

export type ModuleCodeRegistryEntry = {
  moduleId: string;
  templates: Record<string, () => Promise<{ default: ComponentType<any> }>>;
};

export const MODULE_CODE_TEMPLATE_REGISTRY: Record<
  string,
  ModuleCodeRegistryEntry
> = {

};
