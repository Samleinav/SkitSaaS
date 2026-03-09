import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { RouteProxyFn, RouteArea } from './types.js';
/**
 * Verifies session JWT + DB lookup that user is active and has an admin role.
 * Redirects to /admin/login on failure.
 */
export declare const proxyAdmin: RouteProxyFn;
/**
 * Verifies session JWT + DB lookup that user is active (any role).
 * Redirects to /sign-in on failure.
 */
export declare const proxyAuth: RouteProxyFn;
/**
 * Blocks access if the area is disabled by the app surface mode config.
 */
export declare function proxySurfaceArea(area: RouteArea): RouteProxyFn;
/**
 * Execute proxy functions in order.
 * Returns the first non-null response (short-circuit), or NextResponse.next().
 */
export declare function executeProxyChain(fns: RouteProxyFn[], request: NextRequest): Promise<NextResponse>;
