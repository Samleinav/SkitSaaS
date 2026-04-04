#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_PATH = path.resolve(process.cwd(), 'lib/db/schema.ts');
const DOCS_SCOPE_DIRS = [
  path.resolve(process.cwd(), 'docs/reference'),
  path.resolve(process.cwd(), 'docs/subscriptions'),
  path.resolve(process.cwd(), 'docs/operations'),
  path.resolve(process.cwd(), 'docs/security'),
  path.resolve(process.cwd(), 'docs/skitsaas/reference'),
  path.resolve(process.cwd(), 'docs/skitsaas/subscriptions'),
  path.resolve(process.cwd(), 'docs/skitsaas/operations'),
  path.resolve(process.cwd(), 'docs/skitsaas/security')
];
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

const REQUIRED_TABLES = [
  'auth_external_identities',
  'subscription_assignments',
  'subscription_change_requests',
  'subscription_trial_usage',
  'checkout_orders',
  'checkout_order_items',
  'payment_orders',
  'payment_logs',
  'payment_transactions',
  'quota_usage',
  'sys_activity_logs',
  'email_logs',
  'app_configs',
  'app_themes',
  'user_theme_preferences',
  'app_modules'
];

function listMarkdownFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function readSchemaTables() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error('Missing lib/db/schema.ts');
  }

  const contents = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const regex = /pgTable\(\s*['"]([a-z0-9_]+)['"]/g;
  const tables = new Set();

  for (const match of contents.matchAll(regex)) {
    tables.add(match[1]);
  }

  return tables;
}

function readDocsContents() {
  const files = DOCS_SCOPE_DIRS.flatMap((dirPath) => listMarkdownFiles(dirPath));
  return files.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
}

function main() {
  const schemaTables = readSchemaTables();
  const docsContent = readDocsContents();
  const errors = [];

  for (const tableName of REQUIRED_TABLES) {
    if (!schemaTables.has(tableName)) {
      errors.push(`Required table not found in schema: ${tableName}`);
      continue;
    }

    if (!docsContent.includes(tableName)) {
      errors.push(`Required table not referenced in docs scope: ${tableName}`);
    }
  }

  if (errors.length > 0) {
    console.error('[docs-validate-db-tables] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[docs-validate-db-tables] OK (${REQUIRED_TABLES.length} required tables validated).`
  );
}

main();
