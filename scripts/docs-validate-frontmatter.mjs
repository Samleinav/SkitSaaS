#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = path.resolve(process.cwd(), 'docs');
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

function listMarkdownFiles(dirPath) {
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

    const extension = path.extname(entry.name).toLowerCase();
    if (MARKDOWN_EXTENSIONS.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function validateFrontmatter(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const relPath = path.relative(process.cwd(), filePath).replaceAll('\\', '/');
  const errors = [];

  if (lines.length === 0 || lines[0].trim() !== '---') {
    errors.push(`${relPath}:1 missing frontmatter start delimiter (---).`);
    return errors;
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex < 0) {
    errors.push(`${relPath}:1 missing frontmatter end delimiter (---).`);
    return errors;
  }

  const frontmatter = lines.slice(1, endIndex);
  const hasTitle = frontmatter.some((line) => /^title\s*:\s*\S+/.test(line.trim()));
  const hasSidebarPosition = frontmatter.some((line) =>
    /^sidebar_position\s*:\s*\d+/.test(line.trim())
  );

  if (!hasTitle) {
    errors.push(`${relPath}:1 missing required frontmatter key "title".`);
  }

  if (!hasSidebarPosition) {
    errors.push(
      `${relPath}:1 missing required frontmatter key "sidebar_position" (numeric).`
    );
  }

  return errors;
}

function main() {
  if (!fs.existsSync(DOCS_ROOT)) {
    console.error('[docs-validate-frontmatter] Missing docs directory.');
    process.exit(1);
  }

  const files = listMarkdownFiles(DOCS_ROOT);
  const errors = [];

  for (const file of files) {
    errors.push(...validateFrontmatter(file));
  }

  if (errors.length > 0) {
    console.error('[docs-validate-frontmatter] Validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`[docs-validate-frontmatter] OK (${files.length} files checked).`);
}

main();

