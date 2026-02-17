import type { ComponentType, ReactNode } from 'react';
import type {
  FrontendThemeRouteDefinition,
  FrontendThemeRoutesModule
} from '@/lib/themes/frontend-routes-contract';
import { THEME_CODE_REGISTRY } from '@/lib/themes/code-registry.generated';
import { THEME_FRONTEND_ROUTE_REGISTRY } from '@/lib/themes/frontend-routes.generated';

type ThemeProviderComponent = ComponentType<{ children: ReactNode }>;

export type FrontendThemeRouteResolveFailureReason =
  | 'missing_theme_id'
  | 'theme_routes_not_registered'
  | 'route_manifest_invalid'
  | 'route_not_registered'
  | 'route_load_failed';

export type FrontendThemeRouteResolution = {
  Component: ComponentType<any> | null;
  Provider: ThemeProviderComponent | null;
  metadata: Record<string, unknown> | null;
  themeId: string | null;
  path: string;
  reason: FrontendThemeRouteResolveFailureReason | null;
};

const normalizedRouteMapCache = new Map<
  string,
  Map<string, FrontendThemeRouteDefinition> | null
>();
const loadedRouteComponentCache = new Map<string, ComponentType<any>>();
const loadedProviderComponents = new Map<string, ThemeProviderComponent | null>();

function normalizeId(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFrontendRoutePath(path: string) {
  const normalized = String(path || '').trim().toLowerCase();
  if (!normalized) {
    return '/';
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  return `/${normalized}`;
}

function normalizeRoutesModule(
  value: FrontendThemeRoutesModule | FrontendThemeRouteDefinition[] | null
) {
  if (!value) {
    return null;
  }

  const routes = Array.isArray(value) ? value : value.routes;
  if (!Array.isArray(routes)) {
    return null;
  }

  const normalized = new Map<string, FrontendThemeRouteDefinition>();

  for (const route of routes) {
    if (!route || typeof route !== 'object') {
      return null;
    }

    const routePath = normalizeFrontendRoutePath(route.path);
    if (!routePath) {
      return null;
    }

    if (typeof route.loader !== 'function') {
      return null;
    }

    normalized.set(routePath, {
      path: routePath,
      loader: route.loader,
      metadata:
        route.metadata && typeof route.metadata === 'object'
          ? route.metadata
          : undefined
    });
  }

  return normalized;
}

async function loadFrontendRoutesForTheme(themeId: string) {
  if (normalizedRouteMapCache.has(themeId)) {
    return normalizedRouteMapCache.get(themeId) ?? null;
  }

  const registryEntry = THEME_FRONTEND_ROUTE_REGISTRY[themeId];
  if (!registryEntry) {
    normalizedRouteMapCache.set(themeId, null);
    return null;
  }

  try {
    const routeModule = await registryEntry.routesImport();
    const normalized = normalizeRoutesModule(
      routeModule.default ?? routeModule.routes ?? null
    );
    normalizedRouteMapCache.set(themeId, normalized);
    return normalized;
  } catch {
    normalizedRouteMapCache.set(themeId, null);
    return null;
  }
}

async function loadThemeProviderComponent(themeId: string) {
  if (loadedProviderComponents.has(themeId)) {
    return loadedProviderComponents.get(themeId) ?? null;
  }

  const codeRegistryEntry = THEME_CODE_REGISTRY[themeId];
  if (!codeRegistryEntry?.providerImport) {
    loadedProviderComponents.set(themeId, null);
    return null;
  }

  try {
    const providerModule = await codeRegistryEntry.providerImport();
    const provider = providerModule.default as ThemeProviderComponent;
    loadedProviderComponents.set(themeId, provider);
    return provider;
  } catch {
    loadedProviderComponents.set(themeId, null);
    return null;
  }
}

async function loadRouteComponent({
  themeId,
  routePath,
  route
}: {
  themeId: string;
  routePath: string;
  route: FrontendThemeRouteDefinition;
}) {
  const cacheKey = `${themeId}::${routePath}`;
  const cached = loadedRouteComponentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const module = await route.loader();
  const Component = module.default as ComponentType<any>;
  loadedRouteComponentCache.set(cacheKey, Component);
  return Component;
}

export async function resolveFrontendThemeRoute({
  themeId,
  path
}: {
  themeId: string | null | undefined;
  path: string;
}): Promise<FrontendThemeRouteResolution> {
  const normalizedThemeId = normalizeId(themeId);
  const normalizedPath = normalizeFrontendRoutePath(path);

  if (!normalizedThemeId) {
    return {
      Component: null,
      Provider: null,
      metadata: null,
      themeId: null,
      path: normalizedPath,
      reason: 'missing_theme_id'
    };
  }

  if (!THEME_FRONTEND_ROUTE_REGISTRY[normalizedThemeId]) {
    return {
      Component: null,
      Provider: null,
      metadata: null,
      themeId: normalizedThemeId,
      path: normalizedPath,
      reason: 'theme_routes_not_registered'
    };
  }

  const routes = await loadFrontendRoutesForTheme(normalizedThemeId);
  if (!routes) {
    return {
      Component: null,
      Provider: null,
      metadata: null,
      themeId: normalizedThemeId,
      path: normalizedPath,
      reason: 'route_manifest_invalid'
    };
  }

  const route = routes.get(normalizedPath);
  if (!route) {
    return {
      Component: null,
      Provider: null,
      metadata: null,
      themeId: normalizedThemeId,
      path: normalizedPath,
      reason: 'route_not_registered'
    };
  }

  try {
    const [Component, Provider] = await Promise.all([
      loadRouteComponent({
        themeId: normalizedThemeId,
        routePath: normalizedPath,
        route
      }),
      loadThemeProviderComponent(normalizedThemeId)
    ]);

    return {
      Component,
      Provider,
      metadata:
        route.metadata && typeof route.metadata === 'object'
          ? route.metadata
          : null,
      themeId: normalizedThemeId,
      path: normalizedPath,
      reason: null
    };
  } catch {
    return {
      Component: null,
      Provider: null,
      metadata: null,
      themeId: normalizedThemeId,
      path: normalizedPath,
      reason: 'route_load_failed'
    };
  }
}
