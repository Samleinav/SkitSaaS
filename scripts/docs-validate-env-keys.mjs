#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ENV_DOC_PATH = path.resolve(
  process.cwd(),
  'docs/reference/03-env-variables.md'
);
const ENV_KEY_REGEX = /\|\s*`([A-Z][A-Z0-9_]+)`\s*\|/g;
const SEARCH_DIRS = [
  'app',
  'lib',
  'components',
  'scripts',
  'tests',
  'modules',
  'instrumentation.ts',
  'next.config.ts',
  'package.json'
].map((entry) => path.resolve(process.cwd(), entry));
const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'docs', 'plans']);
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md'
]);

function listSearchFiles(entryPath) {
  if (!fs.existsSync(entryPath)) {
    return [];
  }

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    return [entryPath];
  }

  const entries = fs.readdirSync(entryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSearchFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension) || extension === '') {
      files.push(fullPath);
    }
  }

  return files;
}

function readDocumentedEnvKeys() {
  if (!fs.existsSync(ENV_DOC_PATH)) {
    throw new Error('Missing docs/reference/03-env-variables.md');
  }

  const contents = fs.readFileSync(ENV_DOC_PATH, 'utf8');
  const keys = new Set();

  for (const match of contents.matchAll(ENV_KEY_REGEX)) {
    keys.add(match[1]);
  }

  return [...keys];
}

function keyExistsInCodebase(key, files) {
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(key)) {
      return true;
    }
  }

  return false;
}

function main() {
  const envKeys = readDocumentedEnvKeys();
  const files = SEARCH_DIRS.flatMap((entryPath) => listSearchFiles(entryPath));

  const missing = [];
  for (const key of envKeys) {
    if (!keyExistsInCodebase(key, files)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('[docs-validate-env-keys] Validation failed:');
    for (const key of missing) {
      console.error(`- Documented env key not found in codebase: ${key}`);
    }
    process.exit(1);
  }

  console.log(
    `[docs-validate-env-keys] OK (${envKeys.length} keys checked across ${files.length} files).`
  );
}

main();
