#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const TARGET_DOC_DIRS = [
  path.resolve(process.cwd(), 'docs/core'),
  path.resolve(process.cwd(), 'docs/subscriptions'),
  path.resolve(process.cwd(), 'docs/operations')
];
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

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

function validateOwnership(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Disallow references to module internals in core docs; allow module README links.
    const modulePathMatches = line.matchAll(/modules\/mod\.[a-z0-9.-]+\/([^\s)`]+)/g);
    for (const match of modulePathMatches) {
      const referencedPath = match[1];
      if (referencedPath === 'README.md') {
        continue;
      }

      violations.push(
        `${relPath}:${i + 1} disallowed module-internal reference "modules/.../${referencedPath}". Use module README pointer instead.`
      );
    }

    // Disallow hardcoded module-specific API endpoints in core/subscription/operations docs.
    const hasModuleSpecificApiPath =
      /\/api\/modules\/mod\.[a-z0-9.-]+\//.test(line) ||
      /\/api\/modules\/mod\.[a-z0-9.-]+["'`)]?/.test(line);

    if (hasModuleSpecificApiPath) {
      violations.push(
        `${relPath}:${i + 1} disallowed module-specific API endpoint reference. Use generic "/api/modules/[moduleId]/..." contract or module README.`
      );
    }
  }

  return violations;
}

function main() {
  const files = TARGET_DOC_DIRS.flatMap((dirPath) => listMarkdownFiles(dirPath));
  const violations = [];

  for (const filePath of files) {
    violations.push(...validateOwnership(filePath));
  }

  if (violations.length > 0) {
    console.error('[docs-validate-ownership] Validation failed:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(`[docs-validate-ownership] OK (${files.length} files checked).`);
}

main();

