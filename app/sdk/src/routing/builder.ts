import type { RouteProxyFn, RouteParamMap } from './types.js';
import { registerRoute } from './registry.js';

/**
 * Immutable route builder. Behaves as a string in coercion contexts so it can
 * be used directly in JSX hrefs, template literals, etc.
 *
 * @example
 * const r = RouteAdmin('/users').name('admin.users')
 * `${r}`          // "/admin/users"
 * String(r)       // "/admin/users"
 * r.with({id: 5}) // "/admin/users/5"  (if path is "/admin/users/{id}")
 */
export class RouteBuilder {
  readonly path: string;
  readonly defaultProxies: RouteProxyFn[];
  readonly extraProxies: RouteProxyFn[];

  constructor(
    path: string,
    defaultProxies: RouteProxyFn[] = [],
    extra: RouteProxyFn[] = []
  ) {
    this.path = path;
    this.defaultProxies = defaultProxies;
    this.extraProxies = extra;
  }

  /**
   * Returns the full proxy chain: area defaults first, then per-route extras.
   */
  get allProxies(): RouteProxyFn[] {
    return [...this.defaultProxies, ...this.extraProxies];
  }

  /**
   * Add extra proxy functions on top of the area defaults.
   * Returns a new RouteBuilder — does not mutate the original.
   */
  proxy(fns: RouteProxyFn[]): RouteBuilder {
    return new RouteBuilder(this.path, this.defaultProxies, [
      ...this.extraProxies,
      ...fns
    ]);
  }

  /**
   * Register this route under a name in the global registry.
   * Returns `this` so it can be chained.
   *
   * @example
   * RouteAdmin('/users').name('admin.users')
   */
  name(routeName: string): this {
    registerRoute(routeName, this.path, this.allProxies);
    return this;
  }

  /**
   * Interpolate `{param}` placeholders in the path.
   *
   * @example
   * RouteAdmin('/users/{id}').with({ id: 5 }) // "/admin/users/5"
   */
  with(params: RouteParamMap): string {
    return this.path.replace(/\{(\w+)\}/g, (_, key) => {
      const value = params[key];
      if (value === undefined) {
        throw new Error(
          `Route "${this.path}" requires param "${key}" but it was not provided.`
        );
      }
      return String(value);
    });
  }

  toString(): string {
    return this.path;
  }

  valueOf(): string {
    return this.path;
  }

  [Symbol.toPrimitive](_hint: string): string {
    return this.path;
  }
}
