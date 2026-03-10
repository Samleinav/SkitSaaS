import 'server-only';

import type { RateLimitBackendHandler } from '@skitsaas/sdk';

// ---------------------------------------------------------------------------
// Lua script — atomic fixed-window rate limit in a single round-trip:
//   1. INCR the counter
//   2. Set EXPIRE only on the first request (count == 1)
//   3. Return [count, ttl] so we can derive retryAfterSeconds without a
//      second round-trip
// ---------------------------------------------------------------------------
const RATE_LIMIT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

type RlRedisClient = {
  eval: (script: string, opts: { keys: string[]; arguments: string[] }) => Promise<unknown>;
};

let clientPromise: Promise<RlRedisClient | null> | null = null;

function getRateLimitRedisUrl(): string {
  return (
    process.env.RATE_LIMIT_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    ''
  );
}

async function getRateLimitRedisClient(): Promise<RlRedisClient | null> {
  const url = getRateLimitRedisUrl();
  if (!url) return null;

  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url });
      client.on('error', (err: unknown) => {
        console.error('[rate-limit-redis] client error:', err);
      });
      await client.connect();
      return client as unknown as RlRedisClient;
    } catch (err) {
      console.error('[rate-limit-redis] connection failed, falling back to in-memory:', err);
      clientPromise = null;
      return null;
    }
  })();

  return clientPromise;
}

/**
 * Create a Redis-backed rate limit backend for configureRateLimitBackend().
 *
 * Uses RATE_LIMIT_REDIS_URL or REDIS_URL from the environment.
 * Falls back gracefully to the SDK's in-memory backend if Redis is unavailable.
 *
 * Algorithm: atomic Lua INCR + EXPIRE (fixed window) — one round-trip per request.
 *
 * @example in lib/modules/sdk-server-bootstrap.ts:
 *   import { configureRateLimitBackend } from '@skitsaas/sdk'
 *   import { createRedisRateLimitBackend } from '@/lib/routing/rate-limit-redis'
 *   configureRateLimitBackend(createRedisRateLimitBackend())
 */
export function createRedisRateLimitBackend(): RateLimitBackendHandler {
  return async (ctx) => {
    const client = await getRateLimitRedisClient();
    if (!client) {
      // Redis not reachable — fail open (in-memory already handled before backend call)
      return { limited: false };
    }

    const key = ctx.customKey ?? `rl:${ctx.userId ?? ctx.ip}:${ctx.endpoint}`;

    try {
      const raw = await client.eval(RATE_LIMIT_LUA, {
        keys: [key],
        arguments: [String(ctx.windowSeconds)],
      });

      const [count, ttl] = raw as [number, number];
      const limited = count > ctx.limit;

      return {
        limited,
        retryAfterSeconds: limited ? Math.max(ttl, 1) : undefined,
      };
    } catch (err) {
      console.error('[rate-limit-redis] eval error, failing open:', err);
      return { limited: false };
    }
  };
}

/** Whether Redis is configured for rate limiting. */
export function hasRateLimitRedisConfig(): boolean {
  return Boolean(getRateLimitRedisUrl());
}
