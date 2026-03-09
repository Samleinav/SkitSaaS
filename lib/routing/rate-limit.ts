/**
 * Host-level rate limit helpers — extends the SDK's rate-limit system with
 * JWT-based userId extraction (reads AUTH_SECRET from process.env).
 *
 * For source-package / source-host modules use the SDK directly:
 *
 *   import { withRateLimit, configureRateLimitBackend } from '@skitsaas/sdk'
 *
 * Use this file ONLY when you need userId from the session JWT without a DB
 * round-trip (host-only capability), or for the auth-specific helpers in
 * lib/auth/rate-limit.ts.
 *
 * All types, configureRateLimitBackend, resolveClientIp, and withRateLimit
 * re-exported from SDK so callers can import from either path without mismatch.
 */

import type { NextRequest } from 'next/server';
import {
  checkRateLimit as sdkCheckRateLimit,
  resolveClientIp,
  type RateLimitConfig,
  type RateLimitHandler,
  type RateLimitContext,
  type RateLimitResult,
} from '@skitsaas/sdk';

// Re-export SDK symbols — callers can import from here or directly from SDK.
export type { RateLimitContext, RateLimitResult, RateLimitHandler, RateLimitConfig };
export {
  configureRateLimitBackend,
  resolveClientIp,
  withRateLimit
} from '@skitsaas/sdk';

// ---------------------------------------------------------------------------
// Host-specific: resolve userId from JWT session cookie (no DB round-trip)
// ---------------------------------------------------------------------------

/**
 * Build a base RateLimitContext from a request, including userId decoded from
 * the session JWT (no DB round-trip). Role, plan, and customKey are left
 * undefined — populate them via RateLimitConfig.resolveContext() when needed.
 *
 * Host-only: requires AUTH_SECRET env var.
 */
export async function resolveRateLimitContext(
  request: Request
): Promise<RateLimitContext> {
  const url = new URL(request.url);
  const ip = resolveClientIp(request);
  let userId: number | undefined;

  try {
    const cookieHeader = (request.headers as Headers).get('cookie') ?? '';
    const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
    const cookieValue = sessionMatch?.[1];

    if (cookieValue) {
      const authSecret = process.env.AUTH_SECRET?.trim();
      if (authSecret) {
        const { jwtVerify } = await import('jose');
        const key = new TextEncoder().encode(authSecret);
        const { payload } = await jwtVerify(cookieValue, key, {
          algorithms: ['HS256']
        });
        const id = (payload as { user?: { id?: unknown } }).user?.id;
        if (typeof id === 'number') userId = id;
      }
    }
  } catch {
    // Invalid or missing session — userId stays undefined.
  }

  return {
    ip,
    endpoint: url.pathname,
    method: request.method,
    userId
  };
}

// ---------------------------------------------------------------------------
// Host-extended checkRateLimit — merges JWT userId into context
// ---------------------------------------------------------------------------

/**
 * Host-level checkRateLimit that pre-resolves userId from JWT before
 * delegating to the SDK's checkRateLimit.
 *
 * Use this instead of the SDK's checkRateLimit when you want userId
 * available in key() / limit() without an explicit resolveContext hook.
 */
export async function checkRateLimit(
  configOrHandler: RateLimitConfig | RateLimitHandler,
  request: NextRequest | Request
): Promise<RateLimitResult> {
  // For config objects, pre-resolve userId so key/limit fns can use it.
  if (typeof configOrHandler !== 'function') {
    const baseCtx = await resolveRateLimitContext(request as Request);
    return sdkCheckRateLimit(configOrHandler, request as Request, baseCtx);
  }

  // Custom handler — pass through; the handler receives full resolved context.
  return sdkCheckRateLimit(configOrHandler, request as Request);
}
