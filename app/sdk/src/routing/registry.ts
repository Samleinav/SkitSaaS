import type { RouteProxyFn, RouteParamMap } from './types.js';

export type RouteRegistryEntry = {
  path: string;
  proxies: RouteProxyFn[];
};

// Module-level singleton — populated when route files are imported.
const registry = new Map<string, RouteRegistryEntry>();

export function registerRoute(
  name: string,
  path: string,
  proxies: RouteProxyFn[]
): void {
  registry.set(name, { path, proxies });
}

export function getRegisteredRoute(name: string): RouteRegistryEntry | null {
  return registry.get(name) ?? null;
}

export function getAllRegisteredRoutes(): ReadonlyMap<string, RouteRegistryEntry> {
  return registry;
}

export class RouteNotFoundError extends Error {
  constructor(name: string) {
    super(
      `Route "${name}" is not registered. ` +
        `Make sure the routes file that defines it has been imported ` +
        `(e.g. in lib/routing/all-routes.ts).`
    );
    this.name = 'RouteNotFoundError';
  }
}

/**
 * Build a URL by named route — like Laravel's route() helper.
 *
 * @example
 * route('admin.users')                        // "/admin/users"
 * route('example.admin.edit', { id: 5 })     // "/admin/custom/example-suite/edit/5"
 */
export function route(name: string, params?: RouteParamMap): string {
  const entry = registry.get(name);
  if (!entry) {
    throw new RouteNotFoundError(name);
  }

  if (!params || Object.keys(params).length === 0) {
    return entry.path;
  }

  return entry.path.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(
        `Route "${name}" requires param "${key}" but it was not provided.`
      );
    }
    return String(value);
  });
}
