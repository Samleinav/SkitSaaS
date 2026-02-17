import { createSysActivityLog } from '@/lib/system/activity-logs';

const LEGACY_CHECKOUT_ROUTE_REMOVAL_DATE = '2026-06-30';

function normalizeRoutePath(path: string) {
  const normalized = path.trim();
  return normalized || '/';
}

export function isLegacyCheckoutBridgeRequest(request: Request) {
  return request.headers.get('x-checkout-legacy-bridge') === '1';
}

export async function logLegacyCheckoutRouteUsage({
  request,
  routePath,
  replacementPath,
  provider,
  source
}: {
  request: Request;
  routePath: string;
  replacementPath: string;
  provider: string;
  source: string;
}) {
  if (isLegacyCheckoutBridgeRequest(request)) {
    return;
  }

  const requestUrl = new URL(request.url);
  await createSysActivityLog({
    eventType: 'checkout.legacy_route.used',
    eventCategory: 'checkout',
    action: 'legacy',
    status: 'warning',
    source,
    message: `Legacy checkout route ${normalizeRoutePath(routePath)} was called directly.`,
    metadata: {
      provider,
      routePath: normalizeRoutePath(routePath),
      replacementPath: normalizeRoutePath(replacementPath),
      deprecationStatus: 'active',
      targetRemovalDate: LEGACY_CHECKOUT_ROUTE_REMOVAL_DATE,
      method: request.method,
      requestPath: requestUrl.pathname
    }
  });
}
