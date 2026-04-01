#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const fallbackPostgresUrl = 'postgres://localhost:5432/skitsaas_test';

const env = {
  ...process.env,
  POSTGRES_URL: process.env.POSTGRES_URL?.trim() || fallbackPostgresUrl,
  ADMIN_POSTGRES_URL:
    process.env.ADMIN_POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    fallbackPostgresUrl
};

const result = spawnSync('npx tsx --test tests/**/*.test.ts', {
  stdio: 'inherit',
  env,
  shell: true
});

process.exit(result.status ?? 1);
