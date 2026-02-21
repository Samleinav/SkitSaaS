#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DOCS_SCOPE_DIRS = [
  path.resolve(process.cwd(), 'docs/core'),
  path.resolve(process.cwd(), 'docs/subscriptions'),
  path.resolve(process.cwd(), 'docs/operations'),
  path.resolve(process.cwd(), 'docs/extensions'),
  path.resolve(process.cwd(), 'docs/modules'),
  path.resolve(process.cwd(), 'docs/sdk')
];
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const API_REGEX = /\/api\/[A-Za-z0-9_\-./:[\]]+/g;

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

function normalizeEndpoint(value) {
  return value.trim().replace(/[),.;:]+$/g, '');
}

function shouldValidateEndpoint(endpoint) {
  if (endpoint.length === 0) {
    return false;
  }

  if (endpoint.includes('*') || endpoint.includes(':')) {
    return false;
  }

  if (endpoint.endsWith('/')) {
    return false;
  }

  if (endpoint.endsWith('/route.ts') || endpoint.includes('.ts')) {
    return false;
  }

  return endpoint.startsWith('/api/');
}

function endpointExists(endpoint) {
  const normalized = endpoint.replaceAll('/', path.sep);

  const directRoutePath = path.resolve(
    process.cwd(),
    `app${normalized}${path.sep}route.ts`
  );
  if (fs.existsSync(directRoutePath)) {
    return true;
  }

  if (endpoint.startsWith('/api/modules/')) {
    const moduleDispatcher = path.resolve(
      process.cwd(),
      path.join(
        'app',
        'api',
        'modules',
        '[moduleId]',
        '[[...slug]]',
        'route.ts'
      )
    );
    return fs.existsSync(moduleDispatcher);
  }

  return false;
}

function validateFile(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const errors = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const matches = line.matchAll(API_REGEX);

    for (const match of matches) {
      const endpoint = normalizeEndpoint(match[0]);
      if (!shouldValidateEndpoint(endpoint)) {
        continue;
      }

      if (!endpointExists(endpoint)) {
        errors.push(
          `${relPath}:${lineIndex + 1} unknown API endpoint reference "${endpoint}".`
        );
      }
    }
  }

  return errors;
}

function main() {
  const files = DOCS_SCOPE_DIRS.flatMap((dirPath) => listMarkdownFiles(dirPath));
  const errors = [];

  for (const filePath of files) {
    errors.push(...validateFile(filePath));
  }

  if (errors.length > 0) {
    console.error('[docs-validate-api-endpoints] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`[docs-validate-api-endpoints] OK (${files.length} files checked).`);
}

main();
