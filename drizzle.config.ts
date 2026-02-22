import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Required for commands that connect to the database (migrate/studio).
    // In Vercel production this must be provided as an env var.
    url: process.env.POSTGRES_URL ?? '',
  },
});

