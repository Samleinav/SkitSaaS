#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const MODULES_ROOT = path.resolve(process.cwd(), 'modules');

const REQUIRED_SECTIONS = [
  {
    key: 'scope',
    description: 'scope/objective',
    patterns: [/^##\s+(scope|current scope|objective|purpose)\b/i]
  },
  {
    key: 'config_env',
    description: 'config/env',
    patterns: [/^##\s+.*(config|runtime config|environment|env)\b/i]
  },
  {
    key: 'routes_api',
    description: 'routes/endpoints',
    patterns: [/^##\s+.*(route|routes|api|endpoint)\b/i]
  },
  {
    key: 'templates',
    description: 'templates/CTC',
    patterns: [/^##\s+.*(template|ctc|ui contract)\b/i]
  },
  {
    key: 'db',
    description: 'database/migrations',
    patterns: [/^##\s+.*(database|db|migration)\b/i]
  },
  {
    key: 'tests',
    description: 'tests/validation',
    patterns: [/^##\s+.*(test|validation)\b/i]
  },
  {
    key: 'troubleshooting',
    description: 'troubleshooting',
    patterns: [/^##\s+.*(troubleshooting|known issues|faq)\b/i]
  }
];

function listModuleDirs() {
  if (!fs.existsSync(MODULES_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(MODULES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('mod.'))
    .map((entry) => entry.name)
    .sort();
}

function readHeadings(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines.filter((line) => /^##\s+/.test(line.trim()));
}

function validateReadme(moduleId) {
  const readmePath = path.join(MODULES_ROOT, moduleId, 'README.md');
  const relReadmePath = path.relative(process.cwd(), readmePath).replaceAll('\\', '/');
  const errors = [];

  if (!fs.existsSync(readmePath)) {
    errors.push(`${moduleId}: missing required README.md (${relReadmePath}).`);
    return errors;
  }

  const headings = readHeadings(readmePath);

  for (const section of REQUIRED_SECTIONS) {
    const found = section.patterns.some((pattern) =>
      headings.some((heading) => pattern.test(heading))
    );

    if (!found) {
      errors.push(
        `${relReadmePath}: missing required section (${section.description}).`
      );
    }
  }

  return errors;
}

function main() {
  const modules = listModuleDirs();
  const warnings = [];

  for (const moduleId of modules) {
    warnings.push(...validateReadme(moduleId));
  }

  if (warnings.length > 0) {
    console.warn('[docs-validate-module-readmes] Advisory recommendations:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
    console.warn(
      '[docs-validate-module-readmes] Non-blocking: section structure is recommended, not required.'
    );
    return;
  }

  console.log(`[docs-validate-module-readmes] OK (${modules.length} modules checked).`);
}

main();
