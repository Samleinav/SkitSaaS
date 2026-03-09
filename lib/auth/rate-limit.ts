/**
 * Auth-specific rate limit helpers — thin wrapper around the SDK's rate-limit system.
 *
 * For per-endpoint, per-user, per-role, or per-plan rate limiting outside of
 * auth flows, import directly from the SDK:
 *
 *   import { withRateLimit, configureRateLimitBackend } from '@skitsaas/sdk'
 *
 * To configure a distributed backend for ALL rate limiters at once:
 *
 *   import { configureRateLimitBackend } from '@skitsaas/sdk'
 *   configureRateLimitBackend(async (ctx) => { ... })
 */

import {
  checkRateLimit,
  resolveClientIp,
  configureRateLimitBackend,
  withRateLimit,
  type RateLimitHandler
} from '@skitsaas/sdk';

export {
  resolveClientIp,
  configureRateLimitBackend,
  withRateLimit
};

// ---------------------------------------------------------------------------
// Auth-specific context and handler types
// ---------------------------------------------------------------------------

export type AuthRateLimitContext = {
  /** Client IP resolved from headers. */
  ip: string;
  /** Auth action being rate-limited. */
  action: 'start' | 'callback';
};

export type AuthRateLimitResult = {
  limited: boolean;
  retryAfterSeconds?: number;
};

export type AuthRateLimitHandler = (
  ctx: AuthRateLimitContext
) => Promise<AuthRateLimitResult>;

// ---------------------------------------------------------------------------
// Auth-specific tighter defaults: 10 attempts per IP per minute
// ---------------------------------------------------------------------------

const AUTH_LIMIT = 10;
const AUTH_WINDOW_SECONDS = 60;

let authHandler: AuthRateLimitHandler | null = null;

/**
 * Inject a custom rate limit handler specifically for auth endpoints.
 *
 * For most cases, configureRateLimitBackend() from the SDK is sufficient
 * since it covers all withRateLimit usages including auth.
 * Use this only when auth needs a completely separate limiting strategy.
 */
export function configureAuthRateLimit(fn: AuthRateLimitHandler): void {
  authHandler = fn;
}

/**
 * Check whether an auth request (login, sign-up) should be rate-limited.
 *
 * Delegates in order:
 *   1. Configured auth-specific handler (configureAuthRateLimit)
 *   2. Global distributed backend (configureRateLimitBackend) — via checkRateLimit
 *   3. In-memory default (10 req/min per IP)
 */
export async function checkAuthRateLimit(
  ctx: AuthRateLimitContext
): Promise<AuthRateLimitResult> {
  if (authHandler) {
    return authHandler(ctx);
  }

  // Build a minimal fake Request to satisfy checkRateLimit's signature.
  // IP and endpoint are the only fields used by the config below.
  const fakeRequest = new Request(`http://localhost/api/auth/${ctx.action}`, {
    headers: { 'x-real-ip': ctx.ip }
  });

  return checkRateLimit(
    {
      key: () => `auth:${ctx.action}:${ctx.ip}`,
      limit: AUTH_LIMIT,
      windowSeconds: AUTH_WINDOW_SECONDS
    },
    fakeRequest
  );
}
