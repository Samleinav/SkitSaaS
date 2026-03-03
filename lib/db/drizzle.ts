import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// App-level client — used by dashboard and frontend.
// When RLS is active this connection runs as `saas_app` role (user-scoped access only).
export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema });

// Admin-level client — used exclusively by the /admin area.
// Uses ADMIN_POSTGRES_URL (saas_admin role, full access) when set;
// falls back to POSTGRES_URL in local dev where a single role is used.
const adminUrl = process.env.ADMIN_POSTGRES_URL ?? process.env.POSTGRES_URL;
export const adminClient = postgres(adminUrl);
export const adminDb = drizzle(adminClient, { schema });
