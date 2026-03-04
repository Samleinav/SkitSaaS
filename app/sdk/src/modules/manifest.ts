import type { ComponentType, ReactNode } from 'react';
import type { ModuleEventHandler } from '../events/types.js';
import type { ModuleMessagesByArea } from '../i18n/types.js';

export type ModuleArea = 'admin' | 'dashboard' | 'frontend' | 'api';
export type ModuleNavArea = 'admin' | 'dashboard' | 'frontend';
export type ModuleRouteAccess = 'public' | 'user' | 'admin';

export type ModuleNavItem = {
  id: string;
  href: string;
  label: string;
  description?: string;
  order?: number;
  exact?: boolean;
};

export type ModuleWidgetDefinition<Props = unknown> = {
  id: string;
  Component: ComponentType<Props>;
  order?: number;
};

export type ModuleRouteContext = {
  moduleId: string;
  slug: string[];
  searchParams?: Record<string, string | string[] | undefined>;
};

export type ModuleFrontendSlotContext = {
  moduleId: string;
  slotId: string;
  route?: string | null;
  payload?: unknown;
  searchParams?: Record<string, string | string[] | undefined>;
};

export type ModulePageHandler = (
  context: ModuleRouteContext
) => Promise<ReactNode | null> | ReactNode | null;

export type ModuleApiHandler = (
  request: Request,
  context: ModuleRouteContext
) => Promise<Response>;

export type ModuleFrontendSlotHandler = (
  context: ModuleFrontendSlotContext
) => Promise<ReactNode | null> | ReactNode | null;

export type ModuleFrontendSlotDefinition = {
  slotId: string;
  description?: string;
  handler: ModuleFrontendSlotHandler;
};

export type ModuleTemplatePackEntry = {
  componentId: string;
  templateId?: string;
  description?: string;
  lockTemplate?: boolean;
  payload?: Record<string, unknown>;
};

export type ModuleTemplatePack = {
  contractRange?: string;
  defaults?: ModuleTemplatePackEntry[];
  overrides?: ModuleTemplatePackEntry[];
};

export type ModuleAuthProviderKind =
  | 'passkey'
  | 'oauth2'
  | 'oidc'
  | 'saml'
  | 'local'
  | 'custom';

export type ModuleAuthProviderFlow = 'login' | 'link' | 'both';

export type ModuleAuthProviderCapabilities = {
  passwordless?: boolean;
  mfa?: boolean;
  enterprise?: boolean;
  justInTimeProvisioning?: boolean;
  groupsSync?: boolean;
};

export type ModuleAuthProviderRoutes = {
  startPath?: string;
  callbackPath?: string;
  healthPath?: string;
};

export type ModuleAuthProvider = {
  providerId: string;
  kind: ModuleAuthProviderKind;
  displayName?: string;
  description?: string;
  flow?: ModuleAuthProviderFlow;
  enabledByDefault?: boolean;
  order?: number;
  routes?: ModuleAuthProviderRoutes;
  capabilities?: ModuleAuthProviderCapabilities;
  metadata?: Record<string, unknown>;
};

export type ModulePaymentOrderType = 'subscription' | 'one_time';

export type ModulePaymentMethodRoutes = {
  startPath: string;
  cancelPath?: string;
  returnPath?: string;
  webhookPath?: string;
};

export type ModulePaymentMethod = {
  paymentMethodId: string;
  displayName?: string;
  description?: string;
  order?: number;
  supportsOrderTypes?: ModulePaymentOrderType[];
  routes: ModulePaymentMethodRoutes;
  metadata?: Record<string, unknown>;
};

export type ModuleUserRole = {
  roleId: string;
  displayName: string;
  description?: string;
  detectForUser: (userId: number) => Promise<boolean>;
};

export type ModuleManifest = {
  moduleId: string;
  version: string;
  displayName: string;
  description?: string;
  i18n?: ModuleMessagesByArea;
  adminNavItems?: ModuleNavItem[];
  dashboardNavItems?: ModuleNavItem[];
  frontendNavItems?: ModuleNavItem[];
  adminRouteAliases?: string[];
  dashboardRouteAliases?: string[];
  frontendRouteAliases?: string[];
  frontendRouteAccess?: ModuleRouteAccess;
  frontendSlots?: ModuleFrontendSlotDefinition[];
  adminDashboardWidgets?: ModuleWidgetDefinition<unknown>[];
  dashboardWidgets?: ModuleWidgetDefinition<unknown>[];
  adminPage?: ModulePageHandler;
  dashboardPage?: ModulePageHandler;
  frontendPage?: ModulePageHandler;
  apiHandler?: ModuleApiHandler;
  eventHandlers?: ModuleEventHandler[];
  templatePack?: ModuleTemplatePack;
  authProviders?: ModuleAuthProvider[];
  paymentMethods?: ModulePaymentMethod[];
  standaloneHomeComponent?: ComponentType<{ userId: number }>;
  standaloneNavItems?:
    | ModuleNavItem[]
    | ((userId: number) => Promise<ModuleNavItem[]>);
  userRoles?: ModuleUserRole[];
};

export function defineModule(manifest: ModuleManifest) {
  return manifest;
}

export function validateModuleManifest(manifest: ModuleManifest) {
  const errors: string[] = [];
  const componentIdPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;
  const slotIdPattern = componentIdPattern;
  const authProviderIdPattern = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
  const paymentMethodIdPattern = authProviderIdPattern;

  if (!manifest.moduleId || !manifest.moduleId.trim()) {
    errors.push('module_id_missing');
  }

  if (!manifest.version || !manifest.version.trim()) {
    errors.push('module_version_missing');
  }

  if (!manifest.displayName || !manifest.displayName.trim()) {
    errors.push('module_display_name_missing');
  }

  const validateAliases = (
    aliases: string[] | undefined,
    area: 'admin' | 'dashboard' | 'frontend'
  ) => {
    if (!aliases?.length) {
      return;
    }

    const seen = new Set<string>();
    const areaPrefix =
      area === 'admin'
        ? '/admin/'
        : area === 'dashboard'
          ? '/dashboard/'
          : '/';
    for (const alias of aliases) {
      const normalized = alias.trim();
      if (
        !normalized.startsWith(areaPrefix) ||
        (area === 'frontend' && normalized === '/') ||
        normalized.includes('?') ||
        normalized.includes('#') ||
        normalized.includes('[') ||
        normalized.includes(']')
      ) {
        errors.push(`module_${area}_route_alias_invalid:${alias}`);
        continue;
      }

      const pathWithoutTrailingSlash =
        normalized.length > 1 && normalized.endsWith('/')
          ? normalized.replace(/\/+$/, '')
          : normalized;
      if (seen.has(pathWithoutTrailingSlash)) {
        errors.push(
          `module_${area}_route_alias_duplicate:${pathWithoutTrailingSlash}`
        );
        continue;
      }

      seen.add(pathWithoutTrailingSlash);
    }
  };

  validateAliases(manifest.adminRouteAliases, 'admin');
  validateAliases(manifest.dashboardRouteAliases, 'dashboard');
  validateAliases(manifest.frontendRouteAliases, 'frontend');

  if (
    manifest.frontendRouteAccess !== undefined &&
    manifest.frontendRouteAccess !== 'public' &&
    manifest.frontendRouteAccess !== 'user' &&
    manifest.frontendRouteAccess !== 'admin'
  ) {
    errors.push('module_frontend_route_access_invalid');
  }

  if (manifest.frontendSlots) {
    const seenSlotIds = new Set<string>();
    for (let index = 0; index < manifest.frontendSlots.length; index += 1) {
      const entry = manifest.frontendSlots[index];
      const slotId = String(entry?.slotId ?? '').trim().toLowerCase();
      if (!slotId || !slotIdPattern.test(slotId)) {
        errors.push(`module_frontend_slot_id_invalid:${index}`);
        continue;
      }

      if (seenSlotIds.has(slotId)) {
        errors.push(`module_frontend_slot_duplicate:${slotId}`);
        continue;
      }

      seenSlotIds.add(slotId);
      if (typeof entry?.handler !== 'function') {
        errors.push(`module_frontend_slot_handler_invalid:${index}`);
      }
    }
  }

  const validateTemplateEntries = (
    entries: ModuleTemplatePackEntry[] | undefined,
    kind: 'defaults' | 'overrides'
  ) => {
    if (!entries) {
      return;
    }

    const seen = new Set<string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const componentId = entry?.componentId?.trim().toLowerCase();
      if (!componentId || !componentIdPattern.test(componentId)) {
        errors.push(`module_template_pack_${kind}_component_invalid:${index}`);
        continue;
      }

      if (seen.has(componentId)) {
        errors.push(`module_template_pack_${kind}_component_duplicate:${componentId}`);
        continue;
      }

      seen.add(componentId);
    }
  };

  if (manifest.templatePack) {
    validateTemplateEntries(manifest.templatePack.defaults, 'defaults');
    validateTemplateEntries(manifest.templatePack.overrides, 'overrides');
  }

  if (manifest.authProviders) {
    const seenProviderIds = new Set<string>();
    for (let index = 0; index < manifest.authProviders.length; index += 1) {
      const provider = manifest.authProviders[index];
      const rawProviderId = String(provider?.providerId ?? '').trim();
      const providerId = rawProviderId.toLowerCase();
      if (
        !providerId ||
        rawProviderId !== providerId ||
        !authProviderIdPattern.test(providerId)
      ) {
        errors.push(`module_auth_provider_id_invalid:${index}`);
        continue;
      }

      if (seenProviderIds.has(providerId)) {
        errors.push(`module_auth_provider_duplicate:${providerId}`);
        continue;
      }

      seenProviderIds.add(providerId);

      if (
        provider.kind !== 'passkey' &&
        provider.kind !== 'oauth2' &&
        provider.kind !== 'oidc' &&
        provider.kind !== 'saml' &&
        provider.kind !== 'local' &&
        provider.kind !== 'custom'
      ) {
        errors.push(`module_auth_provider_kind_invalid:${index}`);
      }

      if (
        provider.flow !== undefined &&
        provider.flow !== 'login' &&
        provider.flow !== 'link' &&
        provider.flow !== 'both'
      ) {
        errors.push(`module_auth_provider_flow_invalid:${index}`);
      }

      const validateProviderPath = (
        value: string | undefined,
        field: 'start_path' | 'callback_path' | 'health_path'
      ) => {
        if (value === undefined) {
          return;
        }

        const normalized = value.trim();
        if (
          !normalized ||
          !normalized.startsWith('/') ||
          normalized.includes('?') ||
          normalized.includes('#') ||
          normalized.includes('[') ||
          normalized.includes(']')
        ) {
          errors.push(`module_auth_provider_${field}_invalid:${index}`);
        }
      };

      validateProviderPath(provider.routes?.startPath, 'start_path');
      validateProviderPath(provider.routes?.callbackPath, 'callback_path');
      validateProviderPath(provider.routes?.healthPath, 'health_path');
    }
  }

  if (manifest.paymentMethods) {
    const seenPaymentMethodIds = new Set<string>();
    for (let index = 0; index < manifest.paymentMethods.length; index += 1) {
      const paymentMethod = manifest.paymentMethods[index];
      const rawPaymentMethodId = String(paymentMethod?.paymentMethodId ?? '').trim();
      const paymentMethodId = rawPaymentMethodId.toLowerCase();
      if (
        !paymentMethodId ||
        rawPaymentMethodId !== paymentMethodId ||
        !paymentMethodIdPattern.test(paymentMethodId)
      ) {
        errors.push(`module_payment_method_id_invalid:${index}`);
        continue;
      }

      if (seenPaymentMethodIds.has(paymentMethodId)) {
        errors.push(`module_payment_method_duplicate:${paymentMethodId}`);
        continue;
      }

      seenPaymentMethodIds.add(paymentMethodId);

      const orderTypes = paymentMethod.supportsOrderTypes ?? [
        'subscription',
        'one_time'
      ];
      if (!Array.isArray(orderTypes) || orderTypes.length === 0) {
        errors.push(`module_payment_method_order_types_invalid:${index}`);
      } else {
        for (const orderType of orderTypes) {
          if (orderType !== 'subscription' && orderType !== 'one_time') {
            errors.push(`module_payment_method_order_types_invalid:${index}`);
            break;
          }
        }
      }

      const validatePaymentMethodPath = (
        value: string | undefined,
        field:
          | 'start_path'
          | 'cancel_path'
          | 'return_path'
          | 'webhook_path'
      ) => {
        if (value === undefined) {
          return;
        }

        const normalized = value.trim();
        if (
          !normalized ||
          !normalized.startsWith('/') ||
          normalized.includes('?') ||
          normalized.includes('#') ||
          normalized.includes('[') ||
          normalized.includes(']')
        ) {
          errors.push(`module_payment_method_${field}_invalid:${index}`);
        }
      };

      validatePaymentMethodPath(paymentMethod.routes?.startPath, 'start_path');
      validatePaymentMethodPath(paymentMethod.routes?.cancelPath, 'cancel_path');
      validatePaymentMethodPath(paymentMethod.routes?.returnPath, 'return_path');
      validatePaymentMethodPath(paymentMethod.routes?.webhookPath, 'webhook_path');
    }
  }

  return errors;
}
