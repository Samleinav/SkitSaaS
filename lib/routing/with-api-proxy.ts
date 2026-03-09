/**
 * API route handler wrapper that applies a proxy chain before the handler runs.
 *
 * Unlike proxy.ts (which runs for all page routes), /api/* routes are excluded
 * from the proxy matcher to avoid intercepting public webhooks and third-party
 * callbacks. Use withApiProxy() to add per-handler auth protection instead.
 *
 * @example — Admin-only API route
 * // app/api/admin/users/route.ts
 * import { withApiProxy } from '@/lib/routing/with-api-proxy'
 * import { proxyApiAdmin } from '@/lib/routing/proxies'
 *
 * export const GET = withApiProxy([proxyApiAdmin], async (request) => {
 *   // Only reached if proxyApiAdmin passes (admin session verified)
 *   return Response.json({ users: [] })
 * })
 *
 * @example — Auth-only API route (any logged-in user)
 * import { withApiProxy } from '@/lib/routing/with-api-proxy'
 * import { proxyApiAuth } from '@/lib/routing/proxies'
 *
 * export const GET = withApiProxy([proxyApiAuth], async (request) => {
 *   return Response.json({ data: [] })
 * })
 *
 * @example — Composing multiple proxies
 * export const POST = withApiProxy(
 *   [proxyApiAdmin, proxyRateLimit],
 *   async (request) => { ... }
 * )
 */
import type { NextRequest, NextResponse } from 'next/server';
import type { RouteProxyFn } from '@skitsaas/sdk';

type ApiHandler = (request: NextRequest, context?: unknown) => Promise<Response | NextResponse>;

/**
 * Wraps a Next.js API route handler with a proxy chain.
 * Returns a 401/403 JSON response if any proxy in the chain short-circuits.
 */
export function withApiProxy(
  proxies: RouteProxyFn[],
  handler: ApiHandler
): ApiHandler {
  return async (request: NextRequest, context?: unknown) => {
    for (const proxy of proxies) {
      const result = await proxy(request);
      if (result !== null) {
        return result; // short-circuit: 401, 403, or 500 JSON response
      }
    }

    return handler(request, context);
  };
}
