/**
 * Route definitions for mod.example.suite.
 *
 * These objects behave as strings in coercion contexts (JSX hrefs, template
 * literals) and register their proxy chains in the global route registry.
 *
 * Usage:
 *   import { ExampleRoutes } from './routes'
 *   <Link href={ExampleRoutes.admin.home} />      // "/admin/custom/example-suite"
 *   ExampleRoutes.admin.edit.with({ id: 5 })      // "/admin/custom/example-suite/edit/5"
 *
 *   import { route } from '@skitsaas/sdk'
 *   route('example.admin.home')                   // "/admin/custom/example-suite"
 *   route('example.admin.edit', { id: 5 })        // "/admin/custom/example-suite/edit/5"
 *
 * If this module later needs proxy.ts to enforce custom per-route extras,
 * declare `routesEntry: "src/routes.ts"` in module.json and run
 * `pnpm modules:prepare`.
 */
import { RouteAdmin, RouteDashboard } from '@skitsaas/sdk';

const ADMIN_BASE = '/custom/example-suite';
const DASHBOARD_BASE = '/custom/example-suite';

export const ExampleRoutes = {
  admin: {
    home:     RouteAdmin(`${ADMIN_BASE}`).name('example.admin.home'),
    create:   RouteAdmin(`${ADMIN_BASE}/create`).name('example.admin.create'),
    settings: RouteAdmin(`${ADMIN_BASE}/settings`).name('example.admin.settings'),
    edit:     RouteAdmin(`${ADMIN_BASE}/edit/{id}`).name('example.admin.edit'),
  },

  dashboard: {
    home:   RouteDashboard(`${DASHBOARD_BASE}`).name('example.dashboard.home'),
    create: RouteDashboard(`${DASHBOARD_BASE}/create`).name('example.dashboard.create'),
    item:   RouteDashboard(`${DASHBOARD_BASE}/items/{id}`).name('example.dashboard.item'),
  },

  /** API base path — not a RouteBuilder, just a string constant */
  apiBase: `/api/modules/mod.example.suite`
} as const;
