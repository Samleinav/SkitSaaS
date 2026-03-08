import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

type PostgresClient = ReturnType<typeof postgres>;
type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;
type CallableTarget = ((...args: unknown[]) => unknown) & object;

let appClient: PostgresClient | null = null;
let appDb: DrizzleDatabase | null = null;
let rootAdminClient: PostgresClient | null = null;
let rootAdminDb: DrizzleDatabase | null = null;

function readRequiredDatabaseUrl(
  value: string | undefined,
  envName: 'POSTGRES_URL' | 'ADMIN_POSTGRES_URL'
) {
  const normalized = value?.trim();
  if (normalized) {
    return normalized;
  }

  throw new Error(`${envName} environment variable is not set`);
}

function createLazyProxyHandler<TTarget extends object>(
  resolve: () => TTarget
): ProxyHandler<TTarget> {
  return {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }

      const resolved = resolve();
      const value = Reflect.get(resolved as object, property, resolved as object);
      return typeof value === 'function' ? value.bind(resolved) : value;
    },
    has(target, property) {
      return Reflect.has(target, property) || property in resolve();
    },
    ownKeys(target) {
      return Array.from(
        new Set([
          ...Reflect.ownKeys(resolve() as object),
          ...Reflect.ownKeys(target)
        ])
      );
    },
    getOwnPropertyDescriptor(target, property) {
      return (
        Object.getOwnPropertyDescriptor(target, property) ??
        Object.getOwnPropertyDescriptor(resolve() as object, property)
      );
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(resolve() as object);
    }
  };
}

function createLazyObjectProxy<TTarget extends object>(resolve: () => TTarget): TTarget {
  return new Proxy({} as TTarget, createLazyProxyHandler(resolve));
}

function createLazyFunctionProxy<TTarget extends CallableTarget>(
  resolve: () => TTarget
): TTarget {
  const target = function lazyProxyTarget() {
    return undefined;
  } as unknown as TTarget;

  return new Proxy(target, {
    ...createLazyProxyHandler(resolve),
    apply(_target, thisArg, argArray) {
      return Reflect.apply(resolve(), thisArg, argArray);
    }
  });
}

function getClient() {
  if (appClient) {
    return appClient;
  }

  appClient = postgres(
    readRequiredDatabaseUrl(process.env.POSTGRES_URL, 'POSTGRES_URL')
  );
  return appClient;
}

function getDb() {
  if (appDb) {
    return appDb;
  }

  appDb = drizzle(getClient(), { schema });
  return appDb;
}

function getAdminClient() {
  if (rootAdminClient) {
    return rootAdminClient;
  }

  rootAdminClient = postgres(
    readRequiredDatabaseUrl(
      process.env.ADMIN_POSTGRES_URL ?? process.env.POSTGRES_URL,
      process.env.ADMIN_POSTGRES_URL ? 'ADMIN_POSTGRES_URL' : 'POSTGRES_URL'
    )
  );
  return rootAdminClient;
}

function getAdminDb() {
  if (rootAdminDb) {
    return rootAdminDb;
  }

  rootAdminDb = drizzle(getAdminClient(), { schema });
  return rootAdminDb;
}

// App-level client — used by dashboard and frontend.
// When RLS is active this connection runs as `saas_app` role (user-scoped access only).
export const client = createLazyFunctionProxy<PostgresClient>(getClient);
export const db = createLazyObjectProxy<DrizzleDatabase>(getDb);

// Admin-level client — used exclusively by the /admin area.
// Uses ADMIN_POSTGRES_URL (saas_admin role, full access) when set;
// falls back to POSTGRES_URL in local dev where a single role is used.
export const adminClient = createLazyFunctionProxy<PostgresClient>(getAdminClient);
export const adminDb = createLazyObjectProxy<DrizzleDatabase>(getAdminDb);
