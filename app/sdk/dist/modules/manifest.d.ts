import type { ComponentType, ReactNode } from 'react';
import type { ModuleEventHandler } from '../events/types.js';
import type { ModuleMessagesByArea } from '../i18n/types.js';
import type { ApiRouteEntry } from '../routing/api-route.js';
export type { ApiRouteEntry };
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
    matchedAlias?: string | null;
    searchParams?: Record<string, string | string[] | undefined>;
};
export type ModuleFrontendSlotContext = {
    moduleId: string;
    slotId: string;
    route?: string | null;
    payload?: unknown;
    searchParams?: Record<string, string | string[] | undefined>;
};
export type ModulePageHandler = (context: ModuleRouteContext) => Promise<ReactNode | null> | ReactNode | null;
export type ModuleApiHandler = (request: Request, context: ModuleRouteContext) => Promise<Response>;
export type ModuleFrontendSlotHandler = (context: ModuleFrontendSlotContext) => Promise<ReactNode | null> | ReactNode | null;
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
export type ModuleAuthProviderKind = 'passkey' | 'oauth2' | 'oidc' | 'saml' | 'local' | 'custom';
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
    /**
     * Typed API routes defined with RouteApi(...).METHOD().auth().rateLimit().handler(fn).
     * Takes precedence over apiHandler when present.
     * Define route metadata in routes.ts (edge-safe) and attach handlers here in manifest.ts.
     */
    apiRoutes?: ApiRouteEntry[];
    eventHandlers?: ModuleEventHandler[];
    templatePack?: ModuleTemplatePack;
    authProviders?: ModuleAuthProvider[];
    paymentMethods?: ModulePaymentMethod[];
    standaloneHomeComponent?: ComponentType<{
        userId: number;
    }>;
    standaloneNavItems?: ModuleNavItem[] | ((userId: number) => Promise<ModuleNavItem[]>);
    userRoles?: ModuleUserRole[];
};
export declare function defineModule(manifest: ModuleManifest): ModuleManifest;
export declare function validateModuleManifest(manifest: ModuleManifest): string[];
