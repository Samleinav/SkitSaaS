import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

type PostgresClient = ReturnType<typeof postgres>;
type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

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

function createLazyProxy<TTarget extends object>(resolve: () => TTarget): TTarget {
  return new Proxy({} as TTarget, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }

      const value = Reflect.get(resolve() as object, property, receiver);
      return typeof value === 'function' ? value.bind(resolve()) : value;
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
export const client = createLazyProxy<PostgresClient>(getClient);
export const db = createLazyProxy<DrizzleDatabase>(getDb);

// Admin-level client — used exclusively by the /admin area.
// Uses ADMIN_POSTGRES_URL (saas_admin role, full access) when set;
// falls back to POSTGRES_URL in local dev where a single role is used.
export const adminClient = createLazyProxy<PostgresClient>(getAdminClient);
export const adminDb = createLazyProxy<DrizzleDatabase>(getAdminDb);
