import type { NextRequest, NextResponse } from 'next/server';
/**
 * A proxy function that runs as part of a route's proxy chain.
 * Return null to continue the chain, or a NextResponse to short-circuit.
 */
export type RouteProxyFn = (request: NextRequest) => Promise<NextResponse | null>;
/**
 * Parameters for interpolating route path segments like {id}.
 */
export type RouteParamMap = Record<string, string | number>;
/**
 * The recognized top-level route areas.
 */
export type RouteArea = 'admin' | 'dashboard' | 'frontend';
