import type { ComponentType } from 'react';
import {
  defineModule as defineSdkModule,
  validateModuleManifest as validateSdkModuleManifest,
  type ModuleManifest as SdkModuleManifest,
  type ModuleNavItem
} from '@skitsaas/sdk';

export type {
  ModuleArea,
  ModuleNavArea,
  ModuleRouteAccess,
  ModuleNavItem,
  ModuleWidgetDefinition,
  ModuleRouteContext,
  ModuleFrontendSlotContext,
  ModulePageHandler,
  ModuleApiHandler,
  ModuleFrontendSlotHandler,
  ModuleFrontendSlotDefinition,
  ModuleTemplatePackEntry,
  ModuleTemplatePack,
  ModuleRuntimeConfigFieldKind,
  ModuleRuntimeConfigFieldOption,
  ModuleRuntimeConfigField,
  ModuleRuntimeConfig,
  ModuleAuthProviderKind,
  ModuleAuthProviderFlow,
  ModuleAuthProviderCapabilities,
  ModuleAuthProviderRoutes,
  ModuleAuthProvider,
  ModulePaymentOrderType,
  ModulePaymentTargetType,
  ModulePaymentMethodUiMode,
  ModulePaymentMethodCheckoutUi,
  ModulePaymentMethodRoutes,
  ModulePaymentMethod,
  ModuleLanguagePackScope,
  ModuleLanguagePack
} from '@skitsaas/sdk';

export type ModuleUserRole = {
  roleId: string;
  displayName: string;
  description?: string;
  detectForUser: (userId: number) => Promise<boolean>;
};

export type ModuleManifest = SdkModuleManifest & {
  standaloneHomeComponent?: ComponentType<{ userId: number }>;
  standaloneNavItems?:
    | ModuleNavItem[]
    | ((userId: number) => Promise<ModuleNavItem[]>);
  userRoles?: ModuleUserRole[];
};

export function defineModule(manifest: ModuleManifest) {
  return defineSdkModule(manifest as SdkModuleManifest) as ModuleManifest;
}

export function validateModuleManifest(manifest: ModuleManifest) {
  return validateSdkModuleManifest(manifest as SdkModuleManifest);
}
