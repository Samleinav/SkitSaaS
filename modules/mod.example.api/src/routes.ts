/**
 * mod.example.api — API route definitions (edge-safe, no handler imports).
 *
 * Only metadata lives here: path, method, auth level, rate-limit config, route name.
 * Handlers are attached in manifest.ts via .handler(fn).
 */
import { RouteApi } from '@skitsaas/sdk';

// Path relative to the API base prefix (default '/api', configurable via NEXT_PUBLIC_ROUTE_BASE_API).
// RouteApi() prepends the base automatically — do NOT include it here.
const BASE = '/modules/mod.example.api';

export const ExampleApiRoutes = {
  /** GET /api/modules/mod.example.api/test — public health check */
  test: RouteApi(`${BASE}/test`).GET().name('mod.example.api.test'),

  /** GET /api/modules/mod.example.api/status — requires active session */
  status: RouteApi(`${BASE}/status`).GET().auth('user').name('mod.example.api.status'),

  /** POST /api/modules/mod.example.api/items — requires admin, rate-limited */
  createItem: RouteApi(`${BASE}/items`)
    .POST()
    .auth('admin')
    .rateLimit({ limit: 10, windowSeconds: 60 })
    .name('mod.example.api.items.create'),

  /** GET /api/modules/mod.example.api/items/{id} — requires session */
  getItem: RouteApi(`${BASE}/items/{id}`).GET().auth('user').name('mod.example.api.items.get'),

  /** DELETE /api/modules/mod.example.api/items/{id} — requires admin */
  deleteItem: RouteApi(`${BASE}/items/{id}`).DELETE().auth('admin').name('mod.example.api.items.delete'),
} as const;
