import type { ComponentType } from 'react';

export type ModuleCodeRegistryEntry = {
  moduleId: string;
  templates: Record<string, () => Promise<{ default: ComponentType<any> }>>;
};

export const MODULE_CODE_TEMPLATE_REGISTRY: Record<
  string,
  ModuleCodeRegistryEntry
> = {
  "mod.commerce.products": {
    moduleId: "mod.commerce.products",
    templates: {
      "page.admin.products": () => import("@/modules/mod.commerce.products/src/templates/page.admin.products"),
      "page.admin.products.create": () => import("@/modules/mod.commerce.products/src/templates/page.admin.products.create"),
      "page.admin.products.edit": () => import("@/modules/mod.commerce.products/src/templates/page.admin.products.edit"),
      "section.admin.products.form": () => import("@/modules/mod.commerce.products/src/templates/section.admin.products.form"),
      "section.admin.products.table": () => import("@/modules/mod.commerce.products/src/templates/section.admin.products.table"),
    }
  }
};
