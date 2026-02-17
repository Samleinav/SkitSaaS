type RedisClient = {
  lPush: (key: string, ...values: string[]) => Promise<number>;
  rPop: (key: string) => Promise<string | null>;
};

let redisClientPromise: Promise<RedisClient | null> | null = null;

function getRedisUrl() {
  return (
    process.env.EVENTS_REDIS_URL?.trim() ||
    process.env.REDIS_URL?.trim() ||
    ''
  );
}

export function hasRedisConfig() {
  return Boolean(getRedisUrl());
}

export async function getRedisClient(): Promise<RedisClient | null> {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  if (redisClientPromise) {
    return redisClientPromise;
  }

  redisClientPromise = (async () => {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });

      client.on('error', (error: unknown) => {
        console.error('Redis event queue client error:', error);
      });

      await client.connect();
      return {
        lPush: (key: string, ...values: string[]) => client.lPush(key, values),
        rPop: async (key: string) => {
          const value = await client.rPop(key);
          return typeof value === 'string' ? value : null;
        }
      };
    } catch (error) {
      console.error('Unable to initialize Redis client for events:', error);
      redisClientPromise = null;
      return null;
    }
  })();

  return redisClientPromise;
}
